package com.ShoeStore.service;

import com.ShoeStore.model.ImageSearchResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class ImageSearchService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=}")
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

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("response_mime_type", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(apiUrl + apiKey, entity, String.class);

        ObjectMapper mapper = new ObjectMapper();
        JsonNode rootNode = mapper.readTree(response.getBody());

        String textResult = rootNode.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text").asText();

        textResult = textResult.replaceAll("```json\n?", "");
        textResult = textResult.replaceAll("```\n?", "");
        textResult = textResult.trim();

        return mapper.readValue(textResult, ImageSearchResult.class);
    }
}
// rebuild
