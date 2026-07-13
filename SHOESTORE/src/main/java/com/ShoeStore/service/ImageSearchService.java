package com.ShoeStore.service;

import com.ShoeStore.model.ImageSearchResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class ImageSearchService {

    private static final Logger log = LoggerFactory.getLogger(ImageSearchService.class);
    private static final int MAX_RETRIES = 3;

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=}")
    private String apiUrl;

    public ImageSearchResult analyzeImage(MultipartFile file) throws Exception {
        String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = file.getContentType();
        if (mimeType == null)
            mimeType = "image/jpeg";

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> requestBody = new HashMap<>();

        Map<String, Object> textPart = new HashMap<>();
        String prompt = "Bạn là một AI phân tích hình ảnh giày. Hãy trả về kết quả định dạng JSON thuần "
                + "chỉ chứa 3 key: 'brand', 'category', 'color'. "
                + "Quy tắc: "
                + "1. brand: Tên hãng thương hiệu (Ví dụ: Nike, Adidas, Puma, Balenciaga, Vans, Converse...). "
                + "2. category: Loại giày hoặc dòng giày (Ví dụ: Sneaker, Running, Basketball, Slip-on...). "
                + "3. color: Màu sắc chủ đạo bằng Tiếng Việt (Ví dụ: Trắng, Đen, Đỏ, Xanh...). "
                + "Nếu không nhận diện được giá trị nào đó, hoặc ảnh không phải đôi giày, hãy để value là chuỗi rỗng: \"\". "
                + "KHÔNG giải thích thêm. KHÔNG dùng markdown.";
        textPart.put("text", prompt);

        Map<String, String> inlineData = new HashMap<>();
        inlineData.put("mimeType", mimeType);
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = new HashMap<>();
        imagePart.put("inlineData", inlineData);

        Map<String, Object> partContainer = new HashMap<>();
        partContainer.put("parts", Arrays.asList(textPart, imagePart));

        requestBody.put("contents", Collections.singletonList(partContainer));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("responseMimeType", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        // Retry logic for transient errors (503, 429, etc.)
        ResponseEntity<String> response = null;
        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log.info("Gemini API call attempt {}/{}", attempt, MAX_RETRIES);
                response = restTemplate.postForEntity(apiUrl + apiKey, entity, String.class);
                break; // Success, exit retry loop
            } catch (HttpServerErrorException e) {
                lastException = e;
                log.warn("Gemini API attempt {}/{} failed: {} - {}", attempt, MAX_RETRIES,
                        e.getStatusCode(), e.getMessage());
                if (attempt < MAX_RETRIES) {
                    long waitMs = 2000L * attempt; // 2s, 4s, 6s
                    log.info("Waiting {}ms before retry...", waitMs);
                    Thread.sleep(waitMs);
                }
            }
        }

        if (response == null) {
            throw new Exception("Gemini API không phản hồi sau " + MAX_RETRIES
                    + " lần thử. Vui lòng thử lại sau.", lastException);
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode rootNode = mapper.readTree(response.getBody());

        String textResult = rootNode.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text").asText();

        textResult = textResult.replaceAll("```json\\n?", "");
        textResult = textResult.replaceAll("```\\n?", "");
        textResult = textResult.trim();

        return mapper.readValue(textResult, ImageSearchResult.class);
    }
}
