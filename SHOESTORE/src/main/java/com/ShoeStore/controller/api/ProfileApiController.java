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

            String sql = "SELECT a.id, a.user_code, a.full_name, a.email, a.phone, a.status, a.role, a.points, a.membership_rank_id, "
                    + "a.saved_bank_bin, a.saved_bank_account, a.saved_account_name, r.rank_name, r.color_code, r.free_shipping "
                    + "FROM accounts a "
                    + "LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id "
                    + "WHERE LOWER(a.email) = LOWER(?)";
            Map<String, Object> freshAccount = jdbc.queryForMap(sql, email);

            if (freshAccount.get("membership_rank_id") == null || freshAccount.get("free_shipping") == null) {
                int pts = freshAccount.get("points") != null ? ((Number) freshAccount.get("points")).intValue() : 0;
                java.util.List<Map<String, Object>> ranks = jdbc.queryForList("SELECT id, rank_name, free_shipping FROM membership_ranks WHERE min_points <= ? ORDER BY min_points DESC", pts);
                if (!ranks.isEmpty()) {
                    int rId = ((Number) ranks.get(0).get("id")).intValue();
                    Object fs = ranks.get(0).get("free_shipping");
                    Object rName = ranks.get(0).get("rank_name");
                    jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", rId, freshAccount.get("id"));
                    freshAccount.put("membership_rank_id", rId);
                    freshAccount.put("free_shipping", fs);
                    freshAccount.put("rank_name", rName);
                }
            }
            freshAccount.put("freeShipping", freshAccount.get("free_shipping"));

            // Xử lý giá trị null thành chuỗi rỗng
            if (freshAccount.get("phone") == null) freshAccount.put("phone", "");
            if (freshAccount.get("full_name") == null) freshAccount.put("full_name", "");
            if (freshAccount.get("saved_bank_bin") == null) freshAccount.put("saved_bank_bin", "970422");
            if (freshAccount.get("saved_bank_account") == null) freshAccount.put("saved_bank_account", "");
            if (freshAccount.get("saved_account_name") == null) freshAccount.put("saved_account_name", "");

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
        String savedBankBin = (String) payload.get("savedBankBin");
        String savedBankAccount = (String) payload.get("savedBankAccount");
        String savedAccountName = (String) payload.get("savedAccountName");

        if (fullName == null || phone == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu fullName hoặc phone!"));
        }

        try {
            Long accountId = ((Number) sessionAccount.get("id")).longValue();

            String updateSql = "UPDATE accounts SET full_name = ?, phone = ?, saved_bank_bin = ?, saved_bank_account = ?, saved_account_name = ? WHERE id = ?";
            jdbc.update(updateSql, fullName, phone, savedBankBin, savedBankAccount, savedAccountName, accountId);

            // Cập nhật session đồng bộ
            sessionAccount.put("full_name", fullName);
            sessionAccount.put("phone", phone);
            sessionAccount.put("saved_bank_bin", savedBankBin);
            sessionAccount.put("saved_bank_account", savedBankAccount);
            sessionAccount.put("saved_account_name", savedAccountName);
            session.setAttribute("account", sessionAccount);

            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật hồ sơ và Sổ ngân hàng thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật hồ sơ: " + e.getMessage()));
        }
    }
}
