package com.ShoeStore.controller.api;

import com.ShoeStore.service.impl.ChatGPTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatBotApiController {

    @Autowired
    private ChatGPTService chatGPTService;

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestBody Map<String, String> request) {
        String userMessage = request.get("message");
        String aiReply = chatGPTService.getAIResponse(userMessage);

        Map<String, String> response = new HashMap<>();
        response.put("reply", aiReply);
        return response;
    }
}
