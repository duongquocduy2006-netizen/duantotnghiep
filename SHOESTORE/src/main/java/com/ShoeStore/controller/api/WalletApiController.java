package com.ShoeStore.controller.api;

import com.ShoeStore.service.WalletService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletApiController {

    @Autowired
    private WalletService walletService;

    @Autowired
    private JdbcTemplate jdbc;

    @GetMapping
    public ResponseEntity<?> getWalletInfo(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        try {
            Long userId = ((Number) sessionAccount.get("id")).longValue();
            double balance = walletService.getWalletBalance(userId);
            var transactions = walletService.getWalletTransactions(userId);

            String accSql = "SELECT saved_bank_bin, saved_bank_account, saved_account_name FROM accounts WHERE id = ?";
            Map<String, Object> bankInfo = jdbc.queryForMap(accSql, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("balance", balance);
            response.put("transactions", transactions);
            response.put("savedBankBin", bankInfo.get("saved_bank_bin") != null ? bankInfo.get("saved_bank_bin") : "970422");
            response.put("savedBankAccount", bankInfo.get("saved_bank_account") != null ? bankInfo.get("saved_bank_account") : "");
            response.put("savedAccountName", bankInfo.get("saved_account_name") != null ? bankInfo.get("saved_account_name") : "");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy thông tin ví: " + e.getMessage()));
        }
    }

    @PostMapping("/withdraw")
    public ResponseEntity<?> requestWithdraw(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        try {
            Long userId = ((Number) sessionAccount.get("id")).longValue();
            Double amount = payload.get("amount") != null ? ((Number) payload.get("amount")).doubleValue() : 0.0;
            String bankBin = (String) payload.get("bankBin");
            String bankAccount = (String) payload.get("bankAccount");
            String accountName = (String) payload.get("accountName");

            walletService.requestWithdraw(userId, amount, bankBin, bankAccount, accountName);

            return ResponseEntity.ok(Map.of("success", true, "message", "Tạo yêu cầu rút tiền thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xử lý rút tiền: " + e.getMessage()));
        }
    }

    // --- ADMIN ENDPOINTS ---

    @GetMapping("/admin/withdrawals")
    public ResponseEntity<?> getAllWithdrawals(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null || !"ADMIN".equalsIgnoreCase((String) sessionAccount.get("role"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Bạn không có quyền truy cập!"));
        }

        try {
            var list = walletService.getAllWithdrawalsForAdmin();
            return ResponseEntity.ok(Map.of("success", true, "withdrawals", list));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách rút tiền: " + e.getMessage()));
        }
    }

    @PostMapping("/admin/withdrawals/approve")
    public ResponseEntity<?> approveWithdrawal(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null || !"ADMIN".equalsIgnoreCase((String) sessionAccount.get("role"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Bạn không có quyền truy cập!"));
        }

        try {
            Long txId = ((Number) payload.get("txId")).longValue();
            walletService.approveWithdrawal(txId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xác nhận chuyển khoản rút tiền thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi duyệt rút tiền: " + e.getMessage()));
        }
    }

    @PostMapping("/admin/withdrawals/reject")
    public ResponseEntity<?> rejectWithdrawal(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        if (sessionAccount == null || !"ADMIN".equalsIgnoreCase((String) sessionAccount.get("role"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Bạn không có quyền truy cập!"));
        }

        try {
            Long txId = ((Number) payload.get("txId")).longValue();
            String reason = (String) payload.get("reason");
            walletService.rejectWithdrawal(txId, reason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã từ chối rút tiền và hoàn lại số dư Ví cho khách!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi từ chối rút tiền: " + e.getMessage()));
        }
    }
}
