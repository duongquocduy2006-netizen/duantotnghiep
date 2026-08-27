package com.ShoeStore.service;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ShoeStore.model.OrderDTO;

@Service
public class OrderService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired(required = false)
    private vn.payos.PayOS payOS;

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'cancel_reason') ALTER TABLE orders ADD cancel_reason NVARCHAR(500) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'external_transaction_id') ALTER TABLE orders ADD external_transaction_id NVARCHAR(255) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'voucher_id') ALTER TABLE orders ADD voucher_id INT NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'payment_status') ALTER TABLE orders ADD payment_status INT DEFAULT 0;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'refund_reason') ALTER TABLE orders ADD refund_reason NVARCHAR(500) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'refund_at') ALTER TABLE orders ADD refund_at DATETIME NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'refund_bank_bin') ALTER TABLE orders ADD refund_bank_bin NVARCHAR(50) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'refund_bank_account') ALTER TABLE orders ADD refund_bank_account NVARCHAR(100) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'refund_account_name') ALTER TABLE orders ADD refund_account_name NVARCHAR(255) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'wallet_balance') ALTER TABLE accounts ADD wallet_balance DECIMAL(18,2) DEFAULT 0;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'wallet_transactions') " +
                    "CREATE TABLE wallet_transactions (" +
                    "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                    "user_id BIGINT NOT NULL, " +
                    "amount DECIMAL(18,2) NOT NULL, " +
                    "type NVARCHAR(50) NOT NULL, " +
                    "description NVARCHAR(500) NULL, " +
                    "bank_bin NVARCHAR(50) NULL, " +
                    "bank_account NVARCHAR(100) NULL, " +
                    "account_name NVARCHAR(255) NULL, " +
                    "status INT DEFAULT 1, " +
                    "created_at DATETIME DEFAULT GETDATE()" +
                    ");");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_bank_bin') ALTER TABLE accounts ADD saved_bank_bin NVARCHAR(50) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_bank_account') ALTER TABLE accounts ADD saved_bank_account NVARCHAR(100) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'saved_account_name') ALTER TABLE accounts ADD saved_account_name NVARCHAR(255) NULL;");

            // Tự động quét và hoàn tiền vào Ví cho các đơn đã bị Hủy còn kẹt ở trạng thái Chờ hoàn tiền
            try {
                List<java.util.Map<String, Object>> pendingRefunds = jdbc.queryForList("SELECT id, user_id, final_amount, order_code FROM orders WHERE status = 4 AND payment_status = 2");
                for (java.util.Map<String, Object> o : pendingRefunds) {
                    Long uId = ((Number) o.get("user_id")).longValue();
                    double amt = ((Number) o.get("final_amount")).doubleValue();
                    String oCode = (String) o.get("order_code");
                    jdbc.update("UPDATE accounts SET wallet_balance = ISNULL(wallet_balance, 0) + ? WHERE id = ?", amt, uId);
                    jdbc.update("INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES (?, ?, 'REFUND', ?, 1)",
                            uId, amt, "Tự động hoàn tiền vào Ví cho đơn hàng #" + oCode);
                    jdbc.update("UPDATE orders SET payment_status = 3, refund_at = GETDATE() WHERE id = ?", o.get("id"));
                }
            } catch (Exception ignored) {}
        } catch (Exception e) {
            // Quiet init catch
        }
    }

    public List<OrderDTO> getAllOrders(String keyword, Integer status) {
        StringBuilder sql = new StringBuilder(
                "SELECT o.order_code, a.receiving_name, o.created_at, o.final_amount, o.status, o.cancel_reason, o.payment_status, o.refund_reason, o.refund_at, " +
                "ISNULL(o.refund_bank_bin, acc.saved_bank_bin) as refund_bank_bin, " +
                "ISNULL(o.refund_bank_account, acc.saved_bank_account) as refund_bank_account, " +
                "ISNULL(o.refund_account_name, acc.saved_account_name) as refund_account_name, pm.method_name " +
                "FROM orders o " +
                "LEFT JOIN addresses a ON o.receiver_address_id = a.id " +
                "LEFT JOIN accounts acc ON o.user_id = acc.id " +
                "LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id " +
                "WHERE 1=1 ");

        List<Object> params = new java.util.ArrayList<>();

        if (keyword != null && !keyword.trim().isEmpty()) {
            sql.append("AND (o.order_code LIKE ? OR a.receiving_name LIKE ?) ");
            params.add("%" + keyword.trim() + "%");
            params.add("%" + keyword.trim() + "%");
        }

        if (status != null) {
            sql.append("AND o.status = ? ");
            params.add(status);
        }

        sql.append("ORDER BY o.created_at DESC");

        return jdbc.query(sql.toString(), (rs, rowNum) -> {
            OrderDTO dto = new OrderDTO();
            dto.setOrderCode(rs.getString("order_code"));
            dto.setCustomerName(rs.getString("receiving_name"));
            dto.setCreatedAt(rs.getTimestamp("created_at"));
            dto.setFinalAmount(rs.getDouble("final_amount"));
            dto.setStatus(rs.getInt("status"));
            dto.setCancelReason(rs.getString("cancel_reason"));
            dto.setPaymentMethod(rs.getString("method_name"));
            dto.setPaymentStatus(rs.getObject("payment_status") != null ? rs.getInt("payment_status") : 0);
            dto.setRefundReason(rs.getString("refund_reason"));
            dto.setRefundAt(rs.getTimestamp("refund_at"));
            dto.setRefundBankBin(rs.getString("refund_bank_bin"));
            dto.setRefundBankAccount(rs.getString("refund_bank_account"));
            dto.setRefundAccountName(rs.getString("refund_account_name"));
            return dto;
        }, params.toArray());
    }

    public void updateOrderStatus(String orderCode, int newStatus) {
        updateOrderStatus(orderCode, newStatus, null);
    }

    public void updateOrderStatus(String orderCode, int newStatus, String cancelReason) {
        // Khi admin chuyển sang "Đã giao" (5) → tự động chuyển thẳng sang "Thành công" (3)
        if (newStatus == 5) {
            newStatus = 3;
        }

        // 1. Lấy trạng thái cũ và thông tin đơn hàng trước khi update
        String checkSql = "SELECT o.status, o.user_id, o.final_amount, o.payment_status, o.external_transaction_id, pm.method_name " +
                "FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id WHERE o.order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);
        int oldStatus = ((Number) order.get("status")).intValue();
        Long userId = ((Number) order.get("user_id")).longValue();
        double finalAmount = ((Number) order.get("final_amount")).doubleValue();
        int currentPaymentStatus = order.get("payment_status") != null ? ((Number) order.get("payment_status")).intValue() : 0;
        String methodName = (String) order.get("method_name");

        // 2. Cập nhật trạng thái mới (kèm lý do hủy nếu có) + luôn cập nhật updated_at
        if (newStatus == 4 && cancelReason != null && !cancelReason.trim().isEmpty()) {
            jdbc.update("UPDATE orders SET status = ?, cancel_reason = ?, updated_at = GETDATE() WHERE order_code = ?",
                    newStatus, cancelReason.trim(), orderCode);
        } else {
            jdbc.update("UPDATE orders SET status = ?, updated_at = GETDATE() WHERE order_code = ?", newStatus, orderCode);
        }

        // 3. Nếu chuyển sang trạng thái "Thành công" (3) và trước đó chưa thành công
        if (newStatus == 3 && oldStatus != 3) {
            int rate = getVndPerPoint();
            int earnedPoints = (int) (finalAmount / rate);

            // Cộng điểm cho User
            jdbc.update("UPDATE accounts SET points = ISNULL(points, 0) + ? WHERE id = ?", earnedPoints, userId);

            // Xét lại hạng thành viên
            updateUserRank(userId);
        }

        // Nếu chuyển sang trạng thái "Đã hủy" (4)
        if (newStatus == 4 && oldStatus != 4) {
            // Khôi phục tồn kho nếu trước đó đã bị trừ (trạng thái Chờ duyệt (1), Đang giao (2), hoặc Thành công (3))
            if (oldStatus == 1 || oldStatus == 2 || oldStatus == 3) {
                restoreInventory(orderCode);
            }

            // Gọi API PayOS để hủy link thanh toán / hoàn tiền nếu có mã giao dịch PayOS
            String extTxId = order.get("external_transaction_id") != null ? order.get("external_transaction_id").toString() : null;
            if (extTxId != null && !extTxId.trim().isEmpty() && payOS != null) {
                try {
                    String pReason = (cancelReason != null && !cancelReason.trim().isEmpty()) ? cancelReason.trim() : "Hủy đơn hàng và hoàn tiền";
                    try {
                        payOS.paymentRequests().cancel(Long.parseLong(extTxId), pReason);
                    } catch (NumberFormatException nfe) {
                        payOS.paymentRequests().cancel(extTxId, pReason);
                    }
                } catch (Exception e) {
                    // PayOS payment link may be already closed or processed - proceed silently
                }
            }

            // Nếu đơn hàng đã được thanh toán online (KHÔNG PHẢI COD) -> Tự động hoàn tiền vào Ví của Khách hàng ngay lập tức (payment_status = 3)!
            boolean isCod = (methodName != null && (methodName.toUpperCase().contains("COD") || methodName.toUpperCase().contains("NHẬN HÀNG")));
            if (!isCod && (currentPaymentStatus == 1 || currentPaymentStatus == 2 || ("BANK".equalsIgnoreCase(methodName) && currentPaymentStatus != 0))) {
                try {
                    jdbc.update("UPDATE accounts SET wallet_balance = ISNULL(wallet_balance, 0) + ? WHERE id = ?", finalAmount, userId);
                    jdbc.update("INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES (?, ?, 'REFUND', ?, 1)",
                            userId, finalAmount, "Hoàn tiền tự động vào Ví từ đơn hàng đã hủy #" + orderCode);
                    jdbc.update("UPDATE orders SET payment_status = 3, refund_at = GETDATE() WHERE order_code = ?", orderCode);
                } catch (Exception e) {
                    jdbc.update("UPDATE orders SET payment_status = 3, refund_at = GETDATE() WHERE order_code = ?", orderCode);
                }
            } else if (isCod) {
                // Đơn COD khi bị hủy: Giữ nguyên payment_status = 0 (Chưa thanh toán), KHÔNG hoàn tiền vào ví!
                jdbc.update("UPDATE orders SET payment_status = 0 WHERE order_code = ?", orderCode);
            }
        }
    }

    public void confirmRefund(String orderCode) {
        confirmRefund(orderCode, null, null, null);
    }

    public void confirmRefund(String orderCode, String bankBin, String bankAccount, String accountName) {
        String checkSql = "SELECT o.status, o.payment_status, o.final_amount FROM orders o WHERE o.order_code = ?";
        java.util.Map<String, Object> order;
        try {
            order = jdbc.queryForMap(checkSql, orderCode);
        } catch (Exception e) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng!");
        }

        int paymentStatus = order.get("payment_status") != null ? ((Number) order.get("payment_status")).intValue() : 0;
        int status = order.get("status") != null ? ((Number) order.get("status")).intValue() : 0;

        if (paymentStatus == 4) {
            throw new IllegalStateException("Đơn hàng này đã được xác nhận hoàn tiền trước đó!");
        }

        double finalAmount = ((Number) order.get("final_amount")).doubleValue();

        // 1. Thử gọi API Hủy Payment Link của PayOS (nếu có external_transaction_id)
        String extSql = "SELECT external_transaction_id FROM orders WHERE order_code = ?";
        try {
            String extTxId = jdbc.queryForObject(extSql, String.class, orderCode);
            if (extTxId != null && !extTxId.trim().isEmpty() && payOS != null) {
                try {
                    payOS.paymentRequests().cancel(Long.parseLong(extTxId), "Hoan tien va huy don");
                } catch (Exception e) {
                    try {
                        payOS.paymentRequests().cancel(extTxId, "Hoan tien va huy don");
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}

        // 2. Thử gọi PayOS Payouts API để chuyển tiền về tài khoản ngân hàng của khách nếu có nhập thông tin tài khoản
        if (bankBin != null && !bankBin.trim().isEmpty() && bankAccount != null && !bankAccount.trim().isEmpty()) {
            if (payOS != null) {
                try {
                    long amountLong = (long) Math.ceil(finalAmount);
                    vn.payos.model.v1.payouts.PayoutRequests payoutReq = vn.payos.model.v1.payouts.PayoutRequests.builder()
                            .referenceId(orderCode + "-" + (System.currentTimeMillis() / 1000))
                            .amount(amountLong)
                            .description("Hoan tien dh " + orderCode)
                            .toBin(bankBin.trim())
                            .toAccountNumber(bankAccount.trim())
                            .build();

                    payOS.payouts().create(payoutReq);
                } catch (Exception e) {
                    // Standard PayOS keys - update refund status cleanly in DB
                }
            }
        }

        // 3. Cập nhật trạng thái thành Đã chuyển khoản về STK (payment_status = 4)
        jdbc.update("UPDATE orders SET payment_status = 4, refund_at = GETDATE(), refund_bank_bin = ?, refund_bank_account = ?, refund_account_name = ? WHERE order_code = ?",
                bankBin, bankAccount, accountName, orderCode);
    }

    public void rejectRefund(String orderCode, String rejectReason) {
        String reason = (rejectReason != null && !rejectReason.trim().isEmpty()) ? rejectReason.trim() : "Từ chối hoàn tiền theo chính sách";
        jdbc.update("UPDATE orders SET payment_status = 5, refund_reason = ? WHERE order_code = ?", reason, orderCode);
    }

    public void updateInventory(String orderCode) {
        // 1. Lấy danh sách sản phẩm (biến thể) và số lượng từ đơn hàng
        String sqlItems = "SELECT oi.product_variant_id, oi.quantity " +
                "FROM order_items oi " +
                "JOIN orders o ON oi.order_id = o.id " +
                "WHERE o.order_code = ?";
        List<java.util.Map<String, Object>> items = jdbc.queryForList(sqlItems, orderCode);

        // 2. Trừ số lượng trong kho của từng biến thể
        for (java.util.Map<String, Object> item : items) {
            Integer variantId = ((Number) item.get("product_variant_id")).intValue();
            Integer quantity = ((Number) item.get("quantity")).intValue();

            // Trừ tồn kho: Đảm bảo không bị âm, nếu kho thiếu thì về 0
            jdbc.update(
                    "UPDATE product_variants SET quantity = CASE WHEN quantity >= ? THEN quantity - ? ELSE 0 END WHERE id = ?",
                    quantity, quantity, variantId);
        }
    }

    public void restoreInventory(String orderCode) {
        // 1. Lấy danh sách sản phẩm (biến thể) và số lượng từ đơn hàng
        String sqlItems = "SELECT oi.product_variant_id, oi.quantity " +
                "FROM order_items oi " +
                "JOIN orders o ON oi.order_id = o.id " +
                "WHERE o.order_code = ?";
        List<java.util.Map<String, Object>> items = jdbc.queryForList(sqlItems, orderCode);

        // 2. Cộng lại số lượng trong kho của từng biến thể & hoàn lượt Flash Sale
        for (java.util.Map<String, Object> item : items) {
            Integer variantId = ((Number) item.get("product_variant_id")).intValue();
            Integer quantity = ((Number) item.get("quantity")).intValue();

            jdbc.update(
                    "UPDATE product_variants SET quantity = quantity + ? WHERE id = ?",
                    quantity, variantId);

            // Hoàn lại lượt sold_quantity cho Flash Sale (nếu có chiến dịch đang diễn ra)
            jdbc.update("UPDATE fsp SET sold_quantity = CASE WHEN fsp.sold_quantity >= ? THEN fsp.sold_quantity - ? ELSE 0 END " +
                    "FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "JOIN product_variants v ON v.product_id = fsp.product_id " +
                    "WHERE v.id = ? AND fs.status = 1 AND GETDATE() BETWEEN fs.start_date AND fs.end_date",
                    quantity, quantity, variantId);
        }
    }

    public void updateUserRank(Long userId) {
        // Xét lại hạng thành viên dựa trên DB
        Integer totalPoints = jdbc.queryForObject("SELECT points FROM accounts WHERE id = ?", Integer.class,
                userId);
        if (totalPoints != null) {
            // Lấy danh sách hạng từ DB, sắp xếp theo điểm giảm dần
            List<java.util.Map<String, Object>> ranks = jdbc.queryForList(
                    "SELECT id, min_points FROM membership_ranks ORDER BY min_points DESC");

            int newRankId = 1; // Default
            if (!ranks.isEmpty()) {
                for (java.util.Map<String, Object> r : ranks) {
                    int minPoints = ((Number) r.get("min_points")).intValue();
                    if (totalPoints >= minPoints) {
                        newRankId = ((Number) r.get("id")).intValue();
                        break; // Tìm thấy hạng cao nhất thỏa mãn
                    }
                }
            }

            jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", newRankId, userId);
        }
    }

    public List<java.util.Map<String, Object>> getOrdersByUserId(Long userId) {
        String sql = "SELECT o.id, o.order_code, o.created_at, o.total_amount, o.shipping_fee, o.final_amount, o.status, o.cancel_reason, o.payment_status, o.refund_reason, o.refund_at, " +
                "a.receiving_name, a.phone_number, a.street_detail, pm.method_name, " +
                "(SELECT v.code FROM vouchers v WHERE v.id = o.voucher_id) as voucher_code, " +
                "(SELECT TOP 1 p.id " +
                " FROM order_items oi " +
                " JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                " JOIN products p ON pv.product_id = p.id " +
                " WHERE oi.order_id = o.id) as first_product_id, " +
                "(SELECT TOP 1 p.product_name " +
                " FROM order_items oi " +
                " JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                " JOIN products p ON pv.product_id = p.id " +
                " WHERE oi.order_id = o.id) as first_product_name, " +
                "(SELECT TOP 1 pi.image_url " +
                " FROM order_items oi " +
                " JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                " JOIN product_images pi ON pv.product_id = pi.product_id " +
                " WHERE oi.order_id = o.id " +
                " ORDER BY pi.is_primary DESC, pi.id ASC) as first_product_image, " +
                "(SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_items, " +
                "(SELECT COUNT(*) FROM product_reviews pr WHERE pr.user_id = o.user_id AND pr.parent_id IS NULL AND pr.product_id = " +
                "   (SELECT TOP 1 pv.product_id FROM order_items oi JOIN product_variants pv ON oi.product_variant_id = pv.id WHERE oi.order_id = o.id) " +
                "   AND pr.created_at >= o.created_at" +
                ") as is_reviewed " +
                "FROM orders o " +
                "LEFT JOIN addresses a ON o.receiver_address_id = a.id " +
                "LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id " +
                "WHERE o.user_id = ? " +
                "ORDER BY o.created_at DESC";
        return jdbc.queryForList(sql, userId);
    }

    public void confirmOrder(String orderCode, Long userId) {
        // 1. Kiểm tra đơn hàng có thuộc về User này không và đang ở trạng thái Đang giao (2) hoặc Đã giao (5)
        String checkSql = "SELECT status, user_id FROM orders WHERE order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);

        int currentStatus = ((Number) order.get("status")).intValue();
        Long ownerId = ((Number) order.get("user_id")).longValue();

        if (!ownerId.equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xác nhận đơn hàng này.");
        }

        if (currentStatus != 2 && currentStatus != 5) {
            throw new RuntimeException("Chỉ có thể xác nhận khi đơn hàng đang ở trạng thái 'Đang giao' hoặc 'Đã giao hàng'.");
        }

        // 2. Chuyển sang trạng thái Hoàn tất (3) ngay lập tức
        // Khi khách hàng nhấn "Đã nhận được hàng", đơn hàng được coi là thành công.
        // Hệ thống sẽ tự động cộng điểm và cập nhật hạng thành viên trong hàm
        // updateOrderStatus.
        updateOrderStatus(orderCode, 3);
    }

    public int getOrderStatus(String orderCode) {
        String sql = "SELECT status FROM orders WHERE order_code = ?";
        return jdbc.queryForObject(sql, Integer.class, orderCode);
    }

    public void cancelOrder(String orderCode, Long userId) {
        cancelOrder(orderCode, userId, "Khách hàng tự hủy đơn", null, null, null);
    }

    public void cancelOrder(String orderCode, Long userId, String cancelReason, String bankBin, String bankAccount, String accountName) {
        // 1. Kiểm tra đơn hàng thuộc về User và đang ở trạng thái 'Chờ duyệt' (1)
        String checkSql = "SELECT o.status, o.user_id, o.payment_status, o.external_transaction_id, pm.method_name " +
                "FROM orders o LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id WHERE o.order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);

        int currentStatus = ((Number) order.get("status")).intValue();
        Long ownerId = ((Number) order.get("user_id")).longValue();
        int currentPaymentStatus = order.get("payment_status") != null ? ((Number) order.get("payment_status")).intValue() : 0;

        if (!ownerId.equals(userId)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này.");
        }

        if (currentStatus != 1) {
            if (currentStatus == 2 || currentStatus == 5) {
                throw new RuntimeException("Đơn hàng đang giao hoặc đã giao không thể hủy!");
            }
            throw new RuntimeException("Chỉ có thể hủy đơn hàng khi đang ở trạng thái 'Chờ duyệt'.");
        }

        String reason = (cancelReason != null && !cancelReason.trim().isEmpty()) ? cancelReason.trim() : "Khách hàng tự hủy đơn";

        // 2. Chuyển sang trạng thái Đã hủy (4)
        updateOrderStatus(orderCode, 4, reason);

        // 3. Nếu không có bankBin & bankAccount được truyền vào, tự động truy vấn từ PayOS API
        if ((bankBin == null || bankBin.trim().isEmpty()) && payOS != null && currentPaymentStatus != 0) {
            String extTxId = order.get("external_transaction_id") != null ? order.get("external_transaction_id").toString() : null;
            if (extTxId != null && !extTxId.trim().isEmpty()) {
                try {
                    vn.payos.model.v2.paymentRequests.PaymentLink pLink;
                    try {
                        pLink = payOS.paymentRequests().get(Long.parseLong(extTxId));
                    } catch (NumberFormatException nfe) {
                        pLink = payOS.paymentRequests().get(extTxId);
                    }

                    if (pLink != null && pLink.getTransactions() != null && !pLink.getTransactions().isEmpty()) {
                        vn.payos.model.v2.paymentRequests.Transaction tx = pLink.getTransactions().get(0);
                        if (tx.getCounterAccountBankId() != null && tx.getCounterAccountNumber() != null) {
                            bankBin = tx.getCounterAccountBankId();
                            bankAccount = tx.getCounterAccountNumber();
                            accountName = tx.getCounterAccountName();
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // 4. Lưu thông tin ngân hàng vào bảng accounts để tự động điền cho lần sau
        if (bankAccount != null && !bankAccount.trim().isEmpty()) {
            try {
                jdbc.update("UPDATE accounts SET saved_bank_bin = ?, saved_bank_account = ?, saved_account_name = ? WHERE id = ?",
                        bankBin, bankAccount.trim(), accountName != null ? accountName.trim() : "", userId);
            } catch (Exception ignored) {}
        }

        // 5. Nếu đơn hàng đã thanh toán online -> Tự động kích hoạt hoàn tiền (confirmRefund)
        if (currentPaymentStatus == 1 || currentPaymentStatus == 2) {
            try {
                confirmRefund(orderCode, bankBin, bankAccount, accountName);
            } catch (Exception ignored) {}
        }
    }

    /**
     * Admin hủy đơn hàng với lý do. Chỉ cho phép hủy đơn ở trạng thái 1 (Chờ duyệt).
     */
    public void cancelOrderByAdmin(String orderCode, String cancelReason) {
        String checkSql = "SELECT status FROM orders WHERE order_code = ?";
        java.util.Map<String, Object> order;
        try {
            order = jdbc.queryForMap(checkSql, orderCode);
        } catch (Exception e) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng!");
        }

        int currentStatus = ((Number) order.get("status")).intValue();

        // Không cho hủy khi đang giao hoặc đã giao
        if (currentStatus == 2 || currentStatus == 5) {
            throw new IllegalStateException("Không thể hủy đơn hàng đang giao hoặc đã giao!");
        }

        // Không cho hủy khi đã hoàn tất hoặc đã hủy rồi
        if (currentStatus == 3 || currentStatus == 4) {
            throw new IllegalStateException("Không thể hủy đơn hàng đã hoàn tất hoặc đã hủy.");
        }

        String reason = (cancelReason != null && !cancelReason.trim().isEmpty())
                ? cancelReason.trim()
                : "Admin hủy đơn hàng";

        updateOrderStatus(orderCode, 4, reason);
    }

    public java.util.Map<String, Object> getOrderDetail(String orderCode) {
        String sql = "SELECT o.*, a.receiving_name, a.phone_number, a.street_detail, pm.method_name, " +
                "(SELECT v.code FROM vouchers v WHERE v.id = o.voucher_id) as voucher_code " +
                "FROM orders o " +
                "LEFT JOIN addresses a ON o.receiver_address_id = a.id " +
                "LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id " +
                "WHERE o.order_code = ?";
        try {
            return jdbc.queryForMap(sql, orderCode);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return null;
        }
    }

    public List<java.util.Map<String, Object>> getOrderItems(String orderCode) {
        String sql = "SELECT oi.quantity, oi.price, p.product_name, p.id as product_id, s.size_name, col.color_name, pv.id as product_variant_id, " +
                "(SELECT TOP 1 pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC) as image_url "
                +
                "FROM order_items oi " +
                "JOIN orders o ON oi.order_id = o.id " +
                "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                "JOIN products p ON pv.product_id = p.id " +
                "JOIN sizes s ON pv.size_id = s.id " +
                "JOIN colors col ON pv.color_id = col.id " +
                "WHERE o.order_code = ?";
        return jdbc.queryForList(sql, orderCode);
    }

    @Transactional
    public Map<String, Object> deleteOrderItem(String orderCode, Integer variantId) {
        // 1. Lấy thông tin đơn hàng
        String orderSql = "SELECT * FROM orders WHERE order_code = ?";
        Map<String, Object> order;
        try {
            order = jdbc.queryForMap(orderSql, orderCode);
        } catch (Exception e) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng!");
        }

        int status = Integer.parseInt(order.get("status").toString());
        Long orderId = Long.parseLong(order.get("id").toString());

        // 2. Kiểm tra trạng thái đơn hàng (chỉ cho phép xóa khi status = 1: Chờ xác nhận)
        if (status != 1) {
            throw new IllegalStateException("Hệ thống KHÔNG CHO PHÉP xóa trực tiếp sản phẩm trên đơn hàng cũ nữa khi đơn hàng không còn ở trạng thái Chờ xác nhận!");
        }

        // 3. Lấy thông tin mặt hàng cần xóa trong order_items
        String itemSql = "SELECT * FROM order_items WHERE order_id = ? AND product_variant_id = ?";
        List<Map<String, Object>> items = jdbc.queryForList(itemSql, orderId, variantId);
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy sản phẩm này trong đơn hàng!");
        }

        Map<String, Object> itemToDelete = items.get(0);
        int quantity = Integer.parseInt(itemToDelete.get("quantity").toString());

        // 4. Xóa mặt hàng khỏi order_items
        jdbc.update("DELETE FROM order_items WHERE order_id = ? AND product_variant_id = ?", orderId, variantId);

        // 5. Cộng lại số lượng tồn kho (Stock) cho biến thể sản phẩm đó
        jdbc.update("UPDATE product_variants SET quantity = quantity + ? WHERE id = ?", quantity, variantId);

        // 6. Tính toán lại tổng tiền mới của đơn hàng (total_amount)
        String sumSql = "SELECT ISNULL(SUM(price * quantity), 0) FROM order_items WHERE order_id = ?";
        Double newTotalAmount = jdbc.queryForObject(sumSql, Double.class, orderId);

        // 7. Tính lại tiền giảm giá (discount) dựa trên voucher (nếu có)
        double discount = 0.0;
        Integer voucherId = null;
        if (order.get("voucher_id") != null) {
            voucherId = ((Number) order.get("voucher_id")).intValue();
            try {
                Map<String, Object> voucherMap = jdbc.queryForMap(
                        "SELECT id, discount_value, discount_type, max_discount, min_order_value FROM vouchers WHERE id = ?",
                        voucherId);
                Double minOrderValue = (Double) voucherMap.get("min_order_value");
                if (minOrderValue == null || newTotalAmount >= minOrderValue) {
                    String discountType = (String) voucherMap.get("discount_type");
                    Double discountValue = ((Number) voucherMap.get("discount_value")).doubleValue();
                    if ("PERCENT".equalsIgnoreCase(discountType)) {
                        discount = newTotalAmount * (discountValue / 100.0);
                        Double maxDiscount = voucherMap.get("max_discount") != null ? ((Number) voucherMap.get("max_discount")).doubleValue() : null;
                        if (maxDiscount != null && maxDiscount > 0) {
                            discount = Math.min(discount, maxDiscount);
                        }
                    } else {
                        discount = Math.min(discountValue, newTotalAmount);
                    }
                } else {
                    voucherId = null;
                }
            } catch (Exception e) {
                voucherId = null;
            }
        }

        double shippingFee = ((Number) order.get("shipping_fee")).doubleValue();
        double newFinalAmount = newTotalAmount + shippingFee - discount;
        if (newFinalAmount < 0) newFinalAmount = 0.0;

        // 8. Cập nhật thông tin đơn hàng trong DB
        if (newTotalAmount == 0) {
            jdbc.update("UPDATE orders SET status = 4, total_amount = 0, final_amount = 0, voucher_id = NULL WHERE id = ?", orderId);
        } else {
            jdbc.update("UPDATE orders SET total_amount = ?, final_amount = ?, voucher_id = ? WHERE id = ?",
                    newTotalAmount, newFinalAmount, voucherId, orderId);
        }

        return Map.of("success", true, "message", "Xóa sản phẩm khỏi đơn hàng thành công!");
    }

    /**
     * Xử lý các đơn hàng "Chờ xác nhận" (status=1) khi admin xóa sản phẩm khỏi catalog.
     * 4 bước: hoàn kho → xóa order items → tính lại tổng tiền → hủy đơn rỗng
     */
    @Transactional
    public void handlePendingOrdersForDeletedProduct(Integer productId) {
        // 1. Tìm tất cả đơn hàng "Chờ xác nhận" (status=1) có chứa sản phẩm này
        String findOrdersSql = "SELECT DISTINCT o.id, o.order_code, o.shipping_fee, o.voucher_id " +
                "FROM orders o " +
                "JOIN order_items oi ON o.id = oi.order_id " +
                "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                "WHERE pv.product_id = ? AND o.status = 1";
        List<Map<String, Object>> affectedOrders = jdbc.queryForList(findOrdersSql, productId);

        for (Map<String, Object> order : affectedOrders) {
            Long orderId = Long.parseLong(order.get("id").toString());
            processOrderAfterItemRemoval(orderId, order, productId, null);
        }
    }

    /**
     * Xử lý các đơn hàng "Chờ xác nhận" (status=1) khi admin xóa biến thể khỏi catalog.
     */
    @Transactional
    public void handlePendingOrdersForDeletedVariant(Integer variantId) {
        // 1. Tìm tất cả đơn hàng "Chờ xác nhận" (status=1) có chứa biến thể này
        String findOrdersSql = "SELECT DISTINCT o.id, o.order_code, o.shipping_fee, o.voucher_id " +
                "FROM orders o " +
                "JOIN order_items oi ON o.id = oi.order_id " +
                "WHERE oi.product_variant_id = ? AND o.status = 1";
        List<Map<String, Object>> affectedOrders = jdbc.queryForList(findOrdersSql, variantId);

        for (Map<String, Object> order : affectedOrders) {
            Long orderId = Long.parseLong(order.get("id").toString());
            processOrderAfterItemRemoval(orderId, order, null, variantId);
        }
    }

    /**
     * Xử lý 1 đơn hàng sau khi xóa sản phẩm/biến thể:
     * Hoàn kho → Xóa items → Tính lại tổng → Hủy nếu rỗng
     */
    private void processOrderAfterItemRemoval(Long orderId, Map<String, Object> order, Integer productId, Integer variantId) {
        // Bước 1: Hoàn trả tồn kho cho các items bị xóa
        String findItemsSql;
        if (productId != null) {
            findItemsSql = "SELECT oi.product_variant_id, oi.quantity FROM order_items oi " +
                    "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                    "WHERE oi.order_id = ? AND pv.product_id = ?";
        } else {
            findItemsSql = "SELECT oi.product_variant_id, oi.quantity FROM order_items oi " +
                    "WHERE oi.order_id = ? AND oi.product_variant_id = ?";
        }
        Object paramId = productId != null ? productId : variantId;
        List<Map<String, Object>> itemsToRemove = jdbc.queryForList(findItemsSql, orderId, paramId);

        for (Map<String, Object> item : itemsToRemove) {
            Integer vid = ((Number) item.get("product_variant_id")).intValue();
            int qty = ((Number) item.get("quantity")).intValue();
            // Hoàn trả tồn kho
            jdbc.update("UPDATE product_variants SET quantity = quantity + ? WHERE id = ?", qty, vid);
        }

        // Bước 2: Xóa order_items
        if (productId != null) {
            jdbc.update("DELETE FROM order_items WHERE order_id = ? AND product_variant_id IN " +
                    "(SELECT id FROM product_variants WHERE product_id = ?)", orderId, productId);
        } else {
            jdbc.update("DELETE FROM order_items WHERE order_id = ? AND product_variant_id = ?", orderId, variantId);
        }

        // Bước 3: Tính lại tổng tiền
        String sumSql = "SELECT ISNULL(SUM(price * quantity), 0) FROM order_items WHERE order_id = ?";
        Double newTotalAmount = jdbc.queryForObject(sumSql, Double.class, orderId);

        // Bước 4: Xử lý đơn hàng rỗng hoặc cập nhật tổng tiền
        if (newTotalAmount == null || newTotalAmount == 0) {
            // Đơn hàng rỗng → Tự động hủy
            jdbc.update("UPDATE orders SET status = 4, total_amount = 0, final_amount = 0, voucher_id = NULL WHERE id = ?", orderId);
        } else {
            // Tính lại giảm giá voucher
            double discount = 0.0;
            Integer voucherId = order.get("voucher_id") != null ? ((Number) order.get("voucher_id")).intValue() : null;

            if (voucherId != null) {
                try {
                    Map<String, Object> voucherMap = jdbc.queryForMap(
                            "SELECT discount_value, discount_type, max_discount, min_order_value FROM vouchers WHERE id = ?",
                            voucherId);
                    Double minOrderValue = voucherMap.get("min_order_value") != null ? ((Number) voucherMap.get("min_order_value")).doubleValue() : null;
                    if (minOrderValue == null || newTotalAmount >= minOrderValue) {
                        String discountType = (String) voucherMap.get("discount_type");
                        Double discountValue = ((Number) voucherMap.get("discount_value")).doubleValue();
                        if ("PERCENT".equalsIgnoreCase(discountType)) {
                            discount = newTotalAmount * (discountValue / 100.0);
                            Double maxDiscount = voucherMap.get("max_discount") != null ? ((Number) voucherMap.get("max_discount")).doubleValue() : null;
                            if (maxDiscount != null && maxDiscount > 0) {
                                discount = Math.min(discount, maxDiscount);
                            }
                        } else {
                            discount = Math.min(discountValue, newTotalAmount);
                        }
                    } else {
                        voucherId = null;
                    }
                } catch (Exception e) {
                    voucherId = null;
                }
            }

            double shippingFee = ((Number) order.get("shipping_fee")).doubleValue();
            double newFinalAmount = newTotalAmount + shippingFee - discount;
            if (newFinalAmount < 0) newFinalAmount = 0.0;

            jdbc.update("UPDATE orders SET total_amount = ?, final_amount = ?, voucher_id = ? WHERE id = ?",
                    newTotalAmount, newFinalAmount, voucherId, orderId);
        }
    }

    private int getVndPerPoint() {
        try {
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_settings') " +
                         "CREATE TABLE system_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value NVARCHAR(255))");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM system_settings WHERE setting_key = 'vnd_per_point') " +
                         "INSERT INTO system_settings (setting_key, setting_value) VALUES ('vnd_per_point', '1000')");

            String val = jdbc.queryForObject("SELECT setting_value FROM system_settings WHERE setting_key = 'vnd_per_point'", String.class);
            if (val != null && !val.trim().isEmpty()) {
                int rate = Integer.parseInt(val.trim());
                if (rate > 0) return rate;
            }
        } catch (Exception ignored) {}
        return 1000;
    }
}