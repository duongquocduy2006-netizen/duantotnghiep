package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileApiController {

    @Autowired
    private JdbcTemplate jdbc;

    // 1. LẤY HỒ SƠ CÁ NHÂN CỦA USER ĐANG ĐĂNG NHẬP
    @GetMapping
    public ResponseEntity<?> getProfile(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        try {
            String email = (String) sessionAccount.get("email");

            String sql = "SELECT a.id, a.user_code, a.full_name, a.email, a.phone, a.status, a.role, a.points, a.membership_rank_id, r.rank_name, r.free_shipping "
                    + "FROM accounts a "
                    + "LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id "
                    + "WHERE a.email = ?";
            Map<String, Object> freshAccount = jdbc.queryForMap(sql, email);

            // Xử lý giá trị null thành chuỗi rỗng
            if (freshAccount.get("phone") == null) freshAccount.put("phone", "");
            if (freshAccount.get("full_name") == null) freshAccount.put("full_name", "");

            Long accountId = ((Number) freshAccount.get("id")).longValue();
            String addressSql = "SELECT TOP 1 receiving_name, phone_number, street_detail FROM addresses WHERE user_id = ? ORDER BY id DESC";
            java.util.List<Map<String, Object>> addresses = jdbc.queryForList(addressSql, accountId);
            Map<String, Object> lastAddress = addresses.isEmpty() ? null : addresses.get(0);

            Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("account", freshAccount);
            response.put("lastAddress", lastAddress);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy thông tin hồ sơ: " + e.getMessage()));
        }
    }

    // 2. CẬP NHẬT HỒ SƠ
    @PostMapping("/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        String fullName = (String) payload.get("fullName");
        String phone = (String) payload.get("phone");

        if (fullName == null || phone == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu fullName hoặc phone!"));
        }

        try {
            Long accountId = ((Number) sessionAccount.get("id")).longValue();

            String updateSql = "UPDATE accounts SET full_name = ?, phone = ? WHERE id = ?";
            jdbc.update(updateSql, fullName, phone, accountId);

            // Cập nhật session đồng bộ
            sessionAccount.put("full_name", fullName);
            sessionAccount.put("phone", phone);
            session.setAttribute("account", sessionAccount);

            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thông tin thành công!", "account", sessionAccount));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật thông tin: " + e.getMessage()));
        }
    }

    // 3. ĐỔI MẬT KHẨU
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        String oldPassword = (String) payload.get("oldPassword");
        String newPassword = (String) payload.get("newPassword");
        String confirmPassword = (String) payload.get("confirmPassword");

        if (oldPassword == null || newPassword == null || confirmPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng nhập đầy đủ thông tin mật khẩu!"));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mật khẩu xác nhận không khớp!"));
        }

        try {
            Long accountId = ((Number) sessionAccount.get("id")).longValue();

            // Lấy mật khẩu hiện tại từ DB để so sánh
            String sql = "SELECT password FROM accounts WHERE id = ?";
            String currentDbPass = jdbc.queryForObject(sql, String.class, accountId);

            if (!oldPassword.equals(currentDbPass)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mật khẩu cũ không chính xác!"));
            }

            // Cập nhật mật khẩu mới
            String updateSql = "UPDATE accounts SET password = ? WHERE id = ?";
            jdbc.update(updateSql, newPassword, accountId);

            return ResponseEntity.ok(Map.of("success", true, "message", "Đổi mật khẩu thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi đổi mật khẩu: " + e.getMessage()));
        }
    }
}
