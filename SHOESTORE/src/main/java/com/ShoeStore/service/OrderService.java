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

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'cancel_reason') ALTER TABLE orders ADD cancel_reason NVARCHAR(500) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'external_transaction_id') ALTER TABLE orders ADD external_transaction_id NVARCHAR(255) NULL;");
            jdbc.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'voucher_id') ALTER TABLE orders ADD voucher_id INT NULL;");
        } catch (Exception e) {
            System.err.println("Error auto-checking orders schema in OrderService: " + e.getMessage());
        }
    }

    public List<OrderDTO> getAllOrders(String keyword, Integer status) {
        StringBuilder sql = new StringBuilder(
                "SELECT o.order_code, a.receiving_name, o.created_at, o.final_amount, o.status, pm.method_name " +
                        "FROM orders o " +
                        "LEFT JOIN addresses a ON o.receiver_address_id = a.id " +
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
            dto.setPaymentMethod(rs.getString("method_name"));
            return dto;
        }, params.toArray());
    }

    public void updateOrderStatus(String orderCode, int newStatus) {
        updateOrderStatus(orderCode, newStatus, null);
    }

    public void updateOrderStatus(String orderCode, int newStatus, String cancelReason) {
        // 1. Lấy trạng thái cũ và thông tin đơn hàng trước khi update
        String checkSql = "SELECT status, user_id, final_amount FROM orders WHERE order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);
        int oldStatus = ((Number) order.get("status")).intValue();
        Long userId = ((Number) order.get("user_id")).longValue();
        double finalAmount = ((Number) order.get("final_amount")).doubleValue();

        // 2. Cập nhật trạng thái mới (kèm lý do hủy nếu có)
        if (newStatus == 4 && cancelReason != null && !cancelReason.trim().isEmpty()) {
            jdbc.update("UPDATE orders SET status = ?, cancel_reason = ? WHERE order_code = ?",
                    newStatus, cancelReason.trim(), orderCode);
        } else {
            jdbc.update("UPDATE orders SET status = ? WHERE order_code = ?", newStatus, orderCode);
        }

        // 3. Nếu chuyển sang trạng thái "Thành công" (3) và trước đó chưa thành công
        if (newStatus == 3 && oldStatus != 3) {
            int earnedPoints = (int) (finalAmount / 1000);

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
        }
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

        // 2. Cộng lại số lượng trong kho của từng biến thể
        for (java.util.Map<String, Object> item : items) {
            Integer variantId = ((Number) item.get("product_variant_id")).intValue();
            Integer quantity = ((Number) item.get("quantity")).intValue();

            jdbc.update(
                    "UPDATE product_variants SET quantity = quantity + ? WHERE id = ?",
                    quantity, variantId);
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
        String sql = "SELECT o.id, o.order_code, o.created_at, o.total_amount, o.shipping_fee, o.final_amount, o.status, o.cancel_reason, " +
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
        // 1. Kiểm tra đơn hàng có thuộc về User này không và đang ở trạng thái Shipping
        // (2)
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
        // 1. Kiểm tra đơn hàng thuộc về User và đang ở trạng thái 'Chờ duyệt' (1)
        String checkSql = "SELECT status, user_id FROM orders WHERE order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);

        int currentStatus = ((Number) order.get("status")).intValue();
        Long ownerId = ((Number) order.get("user_id")).longValue();

        if (!ownerId.equals(userId)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này.");
        }

        if (currentStatus != 1) {
            throw new RuntimeException("Chỉ có thể hủy đơn hàng khi đang ở trạng thái 'Chờ duyệt'.");
        }

        // 2. Chuyển sang trạng thái Đã hủy (4), lý do: khách tự hủy
        updateOrderStatus(orderCode, 4, "Khách hàng tự hủy đơn");
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

        if (currentStatus == 2 || currentStatus == 5) {
            throw new IllegalStateException("Đơn hàng đang giao hoặc đã giao hàng, không được phép hủy đơn!");
        }
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
}