package com.ShoeStore.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.ShoeStore.model.OrderDTO;

@Service
public class OrderService {

    @Autowired
    private JdbcTemplate jdbc;

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
        // 1. Lấy trạng thái cũ và thông tin đơn hàng trước khi update
        String checkSql = "SELECT status, user_id, final_amount FROM orders WHERE order_code = ?";
        java.util.Map<String, Object> order = jdbc.queryForMap(checkSql, orderCode);
        int oldStatus = ((Number) order.get("status")).intValue();
        Long userId = ((Number) order.get("user_id")).longValue();
        double finalAmount = ((Number) order.get("final_amount")).doubleValue();

        // 2. Cập nhật trạng thái mới
        String sql = "UPDATE orders SET status = ? WHERE order_code = ?";
        jdbc.update(sql, newStatus, orderCode);

        // 3. Nếu chuyển sang trạng thái "Thành công" (3) và trước đó chưa thành công
        if (newStatus == 3 && oldStatus != 3) {
            int earnedPoints = (int) (finalAmount / 1000);

            // Cộng điểm cho User
            jdbc.update("UPDATE accounts SET points = ISNULL(points, 0) + ? WHERE id = ?", earnedPoints, userId);

            // Xét lại hạng thành viên
            updateUserRank(userId);
        }

        // 4. Nếu chuyển sang trạng thái "Đã hủy" (4) và trước đó chưa hủy
        if (newStatus == 4 && oldStatus != 4) {
            // Khôi phục tồn kho sản phẩm
            restoreInventory(orderCode);
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
        String sql = "SELECT o.id, o.order_code, o.created_at, o.final_amount, o.status, " +
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

        if (currentStatus != 2) {
            throw new RuntimeException("Chỉ có thể xác nhận khi đơn hàng đang ở trạng thái 'Đang giao'.");
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
        // 1. Kiểm tra đơn hàng thuộc về User and đang ở trạng thái 'Chờ duyệt' (1)
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

        // 2. Chuyển sang trạng thái Đã hủy (4)
        updateOrderStatus(orderCode, 4);
    }

    public java.util.Map<String, Object> getOrderDetail(String orderCode) {
        String sql = "SELECT o.*, a.receiving_name, a.phone_number, a.street_detail, pm.method_name " +
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
        String sql = "SELECT oi.quantity, oi.price, p.product_name, p.id as product_id, s.size_name, col.color_name, " +
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
}