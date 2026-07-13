package com.ShoeStore.service;

import com.ShoeStore.model.ImageSearchResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class ImageSearchService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
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
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = new HashMap<>();
        imagePart.put("inline_data", inlineData);

        Map<String, Object> partContainer = new HashMap<>();
        partContainer.put("parts", Arrays.asList(textPart, imagePart));

        requestBody.put("contents", Collections.singletonList(partContainer));

        System.out.println(new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(requestBody));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String fullUrl = apiUrl + apiKey;
        System.out.println("=== [GEMINI DEBUG] Calling URL: " + apiUrl + "***HIDDEN*** ===");

        ResponseEntity<String> response = null;
        int maxRetries = 3;
        int currentAttempt = 0;
        long waitTime = 2000; // 2s

        while (true) {
            try {
                response = restTemplate.postForEntity(fullUrl, entity, String.class);
                break; // Thành công thì thoát vòng lặp
            } catch (HttpServerErrorException e) {
                if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                    if (currentAttempt < maxRetries) {
                        currentAttempt++;
                        System.err.println("=== [GEMINI ERROR] HTTP 503 Service Unavailable. Retry " + currentAttempt
                                + " after " + (waitTime / 1000) + "s ===");
                        try {
                            Thread.sleep(waitTime);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw new Exception("Thao tác bị gián đoạn", ie);
                        }
                        waitTime *= 2; // Tăng thời gian chờ (2s -> 4s -> 8s)
                    } else {
                        throw new Exception("EX_503_OVERLOAD");
                    }
                } else {
                    // Lỗi 5xx khác
                    System.err.println("=== [GEMINI ERROR] HTTP " + e.getStatusCode() + " Server Error ===");
                    System.err.println("Response body: " + e.getResponseBodyAsString());
                    throw new Exception(
                            "Gemini API server error " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
                }
            } catch (HttpClientErrorException e) {
                // Lỗi 4xx
                System.err.println("=== [GEMINI ERROR] HTTP " + e.getStatusCode() + " ===");
                System.err.println("Response body: " + e.getResponseBodyAsString());
                // Xử lý riêng lỗi 429 TOO_MANY_REQUESTS (vượt quota Free Tier)
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    throw new Exception("EX_429_QUOTA");
                }
                throw new Exception("Gemini API lỗi " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            }
        }

        System.out.println("=== [GEMINI DEBUG] Response status: " + response.getStatusCode() + " ===");

        ObjectMapper mapper = new ObjectMapper();
        JsonNode rootNode = mapper.readTree(response.getBody());

        // Kiểm tra xem có lỗi từ Gemini không
        if (rootNode.has("error")) {
            String errMsg = rootNode.path("error").path("message").asText("Unknown error");
            System.err.println("=== [GEMINI ERROR] API error message: " + errMsg + " ===");
            throw new Exception("Gemini API trả về lỗi: " + errMsg);
        }

        JsonNode candidates = rootNode.path("candidates");
        if (candidates.isMissingNode() || candidates.isEmpty()) {
            System.err.println("=== [GEMINI ERROR] Không có candidates trong response ===");
            System.err.println("Full response: " + response.getBody());
            throw new Exception("Gemini API không trả về kết quả nhận diện (candidates rỗng).");
        }

        String textResult = candidates.get(0)
                .path("content").path("parts").get(0).path("text").asText();

        System.out.println("=== [GEMINI DEBUG] Raw text result: " + textResult + " ===");

        textResult = textResult.replaceAll("```json\\n?", "");
        textResult = textResult.replaceAll("```\\n?", "");
        textResult = textResult.trim();

        ImageSearchResult result = mapper.readValue(textResult, ImageSearchResult.class);
        result.setBrand(result.getBrand() != null ? result.getBrand().trim() : "");
        result.setCategory(result.getCategory() != null ? result.getCategory().trim() : "");
        result.setColor(result.getColor() != null ? result.getColor().trim() : "");
        return result;
    }
}
