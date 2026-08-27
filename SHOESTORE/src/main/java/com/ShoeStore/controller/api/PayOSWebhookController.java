package com.ShoeStore.controller.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payos")
public class PayOSWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PayOSWebhookController.class);

    @Autowired(required = false)
    private PayOS payOS;

    @Autowired
    private JdbcTemplate jdbc;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(@RequestBody Map<String, Object> webhookBody) {
        Map<String, Object> response = new HashMap<>();
        try {
            log.info("Nhận tín hiệu PayOS Webhook tự động: {}", webhookBody);

            if (webhookBody != null && webhookBody.containsKey("data")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) webhookBody.get("data");

                if (data != null) {
                    Object orderCodeObj = data.get("orderCode");
                    String bankBin = (String) data.get("counterAccountBankId");
                    String bankAccount = (String) data.get("counterAccountNumber");
                    String accountName = (String) data.get("counterAccountName");

                    if (orderCodeObj != null && bankAccount != null) {
                        String orderCode = String.valueOf(orderCodeObj);
                        log.info("Tự động lưu STK Khách hàng từ PayOS: Order = {}, Bank = {}, STK = {}, Tên = {}", 
                                orderCode, bankBin, bankAccount, accountName);

                        // 1. Tự động lưu thông tin Ngân hàng của Khách hàng vào Đơn hàng
                        jdbc.update(
                            "UPDATE orders SET refund_bank_bin = ?, refund_bank_account = ?, refund_account_name = ? WHERE order_code = ?",
                            bankBin, bankAccount, accountName, orderCode
                        );

                        // 2. Tự động lưu thông tin Ngân hàng mặc định vào Hồ sơ Khách hàng
                        jdbc.update(
                            "UPDATE accounts SET saved_bank_bin = ?, saved_bank_account = ?, saved_account_name = ? WHERE id = (SELECT user_id FROM orders WHERE order_code = ?)",
                            bankBin, bankAccount, accountName, orderCode
                        );
                    }
                }
            }

            response.put("success", true);
            response.put("message", "Đã tự động lưu thông tin Ngân hàng của Khách hàng thành công!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Lỗi xử lý PayOS Webhook: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }
}
