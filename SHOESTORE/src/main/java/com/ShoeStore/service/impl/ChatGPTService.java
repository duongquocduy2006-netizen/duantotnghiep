package com.ShoeStore.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatGPTService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RestTemplate restTemplate;

    private static final String OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions";

    public String getAIResponse(String userMessage) {
        String productsContext = getProductsContext();
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "openai/gpt-3.5-turbo");

        List<Map<String, String>> messages = new ArrayList<>();
        
        String systemInstructions = "Bạn là trợ lý ảo của cửa hàng giày ShoeStore. "
                + "Bạn chỉ được phép trả lời các câu hỏi liên quan đến sản phẩm, chính sách, địa chỉ hoặc dịch vụ của ShoeStore. "
                + "Nếu khách hàng hỏi về các chủ đề khác không liên quan đến shop, hãy từ chối lịch sự. "
                + "Tuyệt đối không trả lời các câu hỏi về chính trị, tôn giáo, hoặc các vấn đề xã hội khác ngoài ShoeStore.\n"
                + "Dưới đây là danh sách sản phẩm THẬT của shop:\n"
                + productsContext + "\n"
                + "QUY TẮC HIỂN THỊ SẢN PHẨM:\n"
                + "1. Chỉ gắn link sản phẩm khi khách hàng yêu cầu gợi ý, hỏi về mẫu mã cụ thể hoặc đang có ý định tìm mua sản phẩm đó.\n"
                + "2. Khi gắn link sản phẩm, bạn PHẢI sử dụng định dạng Card sau ngay sau lời giới thiệu: [PRODUCT:id|name|price|image]\n"
                + "3. Trả lời thân thiện, ngắn gọn và lịch sự bằng tiếng Việt.";

        messages.add(Map.of("role", "system", "content", systemInstructions));
        messages.add(Map.of("role", "user", "content", userMessage));
        
        requestBody.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_URL, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK) {
                Map body = response.getBody();
                List choices = (List) body.get("choices");
                Map firstChoice = (Map) choices.get(0);
                Map msg = (Map) firstChoice.get("message");
                return (String) msg.get("content");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Dạ hiện tại em gặp chút lỗi: " + e.getMessage();
        }
        return "Dạ shop đã nhận tin nhắn!";
    }

    private String getProductsContext() {
        try {
            String sql = "SELECT TOP 10 p.id, p.product_name, " +
                         "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price, " +
                         "(SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id) as image " +
                         "FROM products p WHERE p.status = 1";
            
            List<Map<String, Object>> products = jdbcTemplate.queryForList(sql);
            
            return products.stream()
                .map(p -> String.format("ID: %s, Tên: %s, Giá: %s, Ảnh: %s", 
                    p.get("id"), p.get("product_name"), p.get("price"), p.get("image")))
                .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "Shop có nhiều mẫu Sneaker mới về.";
        }
    }
}
