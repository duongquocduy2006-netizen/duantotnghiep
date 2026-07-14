package com.ShoeStore.service;

import com.ShoeStore.model.ImageSearchResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ImageSearchService {

    private static final Logger log = LoggerFactory.getLogger(ImageSearchService.class);
    private static final int MAX_RETRIES = 3;

    @Value("${openai.api.key}")
    private String apiKey;

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

    public ImageSearchResult analyzeImage(MultipartFile file) throws Exception {
        String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = file.getContentType();
        if (mimeType == null)
            mimeType = "image/jpeg";

        RestTemplate restTemplate = new RestTemplate();

        // System message to enforce strict JSON-only output
        Map<String, Object> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", "You are a shoe image analysis AI. You MUST respond with ONLY a valid JSON object. "
                + "No explanations, no markdown, no extra text. Just pure JSON.");

        // User message with image
        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");

        List<Map<String, Object>> contentList = new ArrayList<>();

        // 1. Text prompt
        Map<String, Object> textContent = new HashMap<>();
        textContent.put("type", "text");
        textContent.put("text", "Analyze this shoe image. Return ONLY this JSON format, nothing else:\n"
                + "{\"brand\":\"BrandName\",\"category\":\"ShoeType\",\"color\":\"ColorInVietnamese\"}\n\n"
                + "Rules:\n"
                + "- brand: Nike, Adidas, Puma, Vans, Converse, etc.\n"
                + "- category: Sneaker, Running, Basketball, Slip-on, etc.\n"
                + "- color: Vietnamese color names (Trắng, Đen, Đỏ, Xanh, Hồng, etc.)\n"
                + "- Use empty string \"\" if unknown.\n"
                + "RESPOND WITH JSON ONLY.");
        contentList.add(textContent);

        // 2. Image prompt
        Map<String, Object> imageContent = new HashMap<>();
        imageContent.put("type", "image_url");
        Map<String, String> imageUrlMap = new HashMap<>();
        imageUrlMap.put("url", "data:" + mimeType + ";base64," + base64Image);
        imageContent.put("image_url", imageUrlMap);
        contentList.add(imageContent);

        userMessage.put("content", contentList);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(systemMessage);
        messages.add(userMessage);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");

        // Retry up to MAX_RETRIES times if AI returns non-JSON
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log.info("Vision analysis attempt {}/{} with openrouter/free", attempt, MAX_RETRIES);

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", "openrouter/free");
                requestBody.put("messages", messages);
                // Request structured output
                requestBody.put("temperature", 0.1);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(OPENROUTER_URL, entity, String.class);

                if (response.getStatusCode() != HttpStatus.OK) {
                    log.warn("Attempt {}: Non-OK status: {}", attempt, response.getStatusCode());
                    continue;
                }

                ObjectMapper mapper = new ObjectMapper();
                JsonNode rootNode = mapper.readTree(response.getBody());

                String textResult = rootNode.path("choices").get(0)
                        .path("message").path("content").asText();

                log.info("Attempt {}: Raw AI response: {}", attempt, textResult);

                // Try to extract JSON
                String jsonStr = extractJson(textResult);

                if (jsonStr != null) {
                    log.info("Attempt {}: Extracted JSON: {}", attempt, jsonStr);
                    return mapper.readValue(jsonStr, ImageSearchResult.class);
                }

                log.warn("Attempt {}: Could not extract JSON from response: {}", attempt, textResult);

            } catch (Exception e) {
                log.warn("Attempt {}: Error: {}", attempt, e.getMessage());
                if (attempt == MAX_RETRIES) {
                    throw new Exception("AI không thể nhận diện hình ảnh sau " + MAX_RETRIES + " lần thử. Vui lòng thử lại.", e);
                }
            }
        }

        throw new Exception("AI không trả về kết quả hợp lệ sau " + MAX_RETRIES + " lần thử. Vui lòng thử ảnh khác.");
    }

    /**
     * Extract a JSON object from a text response that may contain extra text
     * before/after the JSON, markdown code blocks, etc.
     */
    private String extractJson(String text) {
        if (text == null || text.isEmpty()) return null;

        // 1. Strip markdown code block wrappers
        text = text.replaceAll("```json\\s*", "");
        text = text.replaceAll("```\\s*", "");
        text = text.trim();

        ObjectMapper mapper = new ObjectMapper();

        // 2. Try direct parse first
        if (text.startsWith("{")) {
            try {
                mapper.readTree(text);
                return text;
            } catch (Exception ignored) {}
        }

        // 3. Find JSON block containing "brand" key
        Pattern pattern = Pattern.compile("\\{[^{}]*\"brand\"[^{}]*\\}", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String candidate = matcher.group();
            try {
                mapper.readTree(candidate);
                return candidate;
            } catch (Exception ignored) {}
        }

        // 4. Fallback: find any { ... } block
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            String candidate = text.substring(start, end + 1);
            try {
                mapper.readTree(candidate);
                return candidate;
            } catch (Exception ignored) {}
        }

        return null;
    }
}
