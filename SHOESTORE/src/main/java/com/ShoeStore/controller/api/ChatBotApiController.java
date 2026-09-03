package com.ShoeStore.controller.api;

import com.ShoeStore.service.impl.ChatGPTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chatbot")
public class ChatBotApiController {

    @Autowired
    private ChatGPTService chatGPTService;

    private static class SpamTracker {
        String lastMessage = "";
        int repeatCount = 0;
        long lockUntil = 0;
    }

    // IP Lock Map (Persists even if user logs out or session changes)
    private final Map<String, Long> ipLockMap = new ConcurrentHashMap<>();
    // User ID Lock Map
    private final Map<Integer, Long> userIdLockMap = new ConcurrentHashMap<>();
    // Per-session spam tracker
    private final Map<String, SpamTracker> userSpamMap = new ConcurrentHashMap<>();

    @PostMapping("/ask")
    public Map<String, Object> ask(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        try {
            HttpSession session = httpRequest.getSession(true);
            String sessionId = session.getId();

            // Extract IP Address
            String clientIp = httpRequest.getHeader("X-Forwarded-For");
            if (clientIp == null || clientIp.trim().isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
                clientIp = httpRequest.getRemoteAddr();
            }
            if (clientIp != null && clientIp.contains(",")) {
                clientIp = clientIp.split(",")[0].trim();
            }
            if (clientIp == null || clientIp.trim().isEmpty()) {
                clientIp = "127.0.0.1";
            }

            // Extract logged-in user account ID
            Integer userId = null;
            Object accountObj = session.getAttribute("account");
            if (accountObj instanceof Map) {
                Object idObj = ((Map<?, ?>) accountObj).get("id");
                if (idObj instanceof Number) {
                    userId = ((Number) idObj).intValue();
                }
            }

            // Client token from frontend
            String clientToken = (request != null && request.containsKey("clientToken") && !request.get("clientToken").trim().isEmpty())
                    ? request.get("clientToken").trim()
                    : "GUEST";

            long now = System.currentTimeMillis();

            // 1. CHECK IP LOCK & USER ID LOCK FIRST (Cannot be bypassed by logging out or clearing session)
            Long ipLockUntil = ipLockMap.get(clientIp);
            Long userLockUntil = userId != null ? userIdLockMap.get(userId) : null;

            long maxLockUntil = 0;
            if (ipLockUntil != null && now < ipLockUntil) {
                maxLockUntil = Math.max(maxLockUntil, ipLockUntil);
            }
            if (userLockUntil != null && now < userLockUntil) {
                maxLockUntil = Math.max(maxLockUntil, userLockUntil);
            }

            String trackingKey = String.format("IP:%s_SESS:%s_TOK:%s%s", clientIp, sessionId, clientToken, userId != null ? "_USER:" + userId : "");
            SpamTracker tracker = userSpamMap.computeIfAbsent(trackingKey, k -> new SpamTracker());

            if (tracker.lockUntil > 0 && now < tracker.lockUntil) {
                maxLockUntil = Math.max(maxLockUntil, tracker.lockUntil);
            }

            if (maxLockUntil > now) {
                long remainingMin = Math.max(1, (maxLockUntil - now) / 60000);
                response.put("success", false);
                response.put("isBlocked", true);
                response.put("lockUntil", maxLockUntil);
                response.put("reply", "TÀI KHOẢN / THIẾT BỊ TẠM KHÓA: Thiết bị/IP của bạn đã bị tạm khóa gửi tin nhắn trong 10 phút do gửi trùng lặp 1 nội dung 3 lần liên tiếp! Vui lòng quay lại sau " + remainingMin + " phút.");
                return response;
            }

            String userMessage = (request != null && request.containsKey("message")) ? request.get("message") : "";

            // 2. Text Filtering & Sanitization
            if (userMessage == null || userMessage.trim().isEmpty()) {
                response.put("success", false);
                response.put("reply", "Vui lòng nhập nội dung câu hỏi!");
                return response;
            }

            // Strip HTML / Script tags
            String cleanText = userMessage.replaceAll("<[^>]*>", "").trim();
            if (cleanText.isEmpty()) {
                response.put("success", false);
                response.put("reply", "Nội dung câu hỏi chứa ký tự không hợp lệ!");
                return response;
            }

            // Profanity & Bad Words Filter
            String lower = cleanText.toLowerCase();
            String[] profaneWords = {"đm", "dmm", "vãi", "đéo", "clmm", "chó đẻ", "buồi", "lồn", "cặc", "fuck", "shit"};
            for (String pw : profaneWords) {
                if (lower.contains(pw)) {
                    response.put("success", false);
                    response.put("reply", "Vui lòng sử dụng từ ngữ văn minh, lịch sự khi trao đổi với Trợ lý AI của ShoeStore!");
                    return response;
                }
            }

            // 3. Repeat Message Anti-Spam (3 consecutive identical messages -> Block IP & Account for 10 min)
            if (cleanText.equalsIgnoreCase(tracker.lastMessage)) {
                tracker.repeatCount++;
            } else {
                tracker.lastMessage = cleanText;
                tracker.repeatCount = 1;
            }

            if (tracker.repeatCount >= 3) {
                long lockEndTime = now + (10 * 60 * 1000); // 10 minutes lock
                tracker.lockUntil = lockEndTime;
                ipLockMap.put(clientIp, lockEndTime);
                if (userId != null) {
                    userIdLockMap.put(userId, lockEndTime);
                }

                response.put("success", false);
                response.put("isBlocked", true);
                response.put("lockUntil", lockEndTime);
                response.put("reply", "HỆ THỐNG CẢNH BÁO SPAM: Bạn đã gửi trùng lặp 1 nội dung 3 lần liên tiếp! Thiết bị/Tài khoản của bạn bị tạm khóa chức năng Trợ lý AI trong 10 phút.");
                return response;
            }

            // 4. Query AI Intelligent Engine with user ID context
            String aiReply = chatGPTService.getAIResponse(cleanText, userId);
            response.put("success", true);
            response.put("reply", aiReply);

        } catch (Exception e) {
            System.err.println("Chatbot Controller Error: " + e.getMessage());
            response.put("success", false);
            response.put("reply", "Dạ hiện tại cửa hàng ShoeStore có rất nhiều mẫu Sneaker mới về! Bạn có thể xem toàn bộ danh mục tại trang Cửa hàng nhé!");
        }
        return response;
    }
}
