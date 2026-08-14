package com.ShoeStore.controller.api;

import com.ShoeStore.service.impl.ChatGPTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/chatbot")
public class ChatBotApiController {

    @Autowired
    private ChatGPTService chatGPTService;

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        try {
            String userMessage = (request != null && request.containsKey("message")) ? request.get("message") : "";
            String aiReply = chatGPTService.getAIResponse(userMessage);
            response.put("reply", aiReply);
        } catch (Exception e) {
            System.err.println("Chatbot Controller Error: " + e.getMessage());
            response.put("reply", "Dạ hiện tại cửa hàng ShoeStore có rất nhiều mẫu Sneaker mới về! Bạn có thể xem toàn bộ danh mục tại trang Cửa hàng nhé! 😊");
        }
        return response;
    }
}
