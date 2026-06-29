package com.ShoeStore.service;

import com.ShoeStore.model.Activity;
import com.ShoeStore.model.RevenueItem;
import com.ShoeStore.model.TopProduct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DashboardService {

    @Autowired
    private JdbcTemplate jdbc;

    private String getDateCondition(String prefix, String startDate, String endDate, List<Object> params) {
        StringBuilder condition = new StringBuilder();
        if (startDate != null && !startDate.isEmpty()) {
            condition.append(" AND ").append(prefix).append("created_at >= ?");
            params.add(startDate + " 00:00:00");
        }
        if (endDate != null && !endDate.isEmpty()) {
            condition.append(" AND ").append(prefix).append("created_at <= ?");
            params.add(endDate + " 23:59:59");
        }
        return condition.toString();
    }

    // 1. Tổng doanh thu (Đơn hàng status = 3 là thành công)
    public Double getTotalRevenue() {
        return getTotalRevenue(null, null);
    }

    public Double getTotalRevenue(String startDate, String endDate) {
        List<Object> params = new ArrayList<>();
        String sql = "SELECT SUM(final_amount) FROM orders WHERE status = 3" + getDateCondition("", startDate, endDate, params);
        Double total = jdbc.queryForObject(sql, params.toArray(), Double.class);
        return total != null ? total : 0.0;
    }

    // 2. Tổng số đơn hàng mới
    public Integer getNewOrdersCount() {
        return getNewOrdersCount(null, null);
    }

    public Integer getNewOrdersCount(String startDate, String endDate) {
        List<Object> params = new ArrayList<>();
        String sql = "SELECT COUNT(id) FROM orders WHERE 1=1" + getDateCondition("", startDate, endDate, params);
        Integer count = jdbc.queryForObject(sql, params.toArray(), Integer.class);
        return count != null ? count : 0;
    }

    // 3. Số sản phẩm sắp hết hàng (quantity < 10)
    public Integer getLowStockCount() {
        String sql = "SELECT COUNT(id) FROM product_variants WHERE quantity < 10";
        Integer count = jdbc.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }

    // 4. Khách hàng mới
    public Integer getNewCustomersCount() {
        return getNewCustomersCount(null, null);
    }

    public Integer getNewCustomersCount(String startDate, String endDate) {
        List<Object> params = new ArrayList<>();
        String sql = "SELECT COUNT(id) FROM accounts WHERE role = 'USER'" + getDateCondition("", startDate, endDate, params);
        Integer count = jdbc.queryForObject(sql, params.toArray(), Integer.class);
        return count != null ? count : 0;
    }

    // 5. Lấy danh sách Top Sản phẩm bán chạy (Map vào TopProduct của Xếp)
    public List<TopProduct> getTopProducts() {
        return getTopProducts(null, null);
    }

    public List<TopProduct> getTopProducts(String startDate, String endDate) {
        List<Object> params = new ArrayList<>();
        String dateCond = getDateCondition("o.", startDate, endDate, params);
        
        String sql = "SELECT TOP 4 " +
                "p.id, p.product_name, p.product_code, " +
                "(SELECT TOP 1 image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1) as image_url, "
                +
                "c.category_name, " +
                "SUM(oi.quantity) as soldCount, " +
                "SUM(oi.quantity * oi.price) as totalRevenue " +
                "FROM products p " +
                "JOIN categories c ON p.category_id = c.id " +
                "JOIN product_variants pv ON pv.product_id = p.id " +
                "JOIN order_items oi ON oi.product_variant_id = pv.id " +
                "JOIN orders o ON oi.order_id = o.id " +
                "WHERE o.status = 3 " + dateCond +
                " GROUP BY p.id, p.product_name, p.product_code, c.category_name " +
                "ORDER BY soldCount DESC";

        return jdbc.query(sql, params.toArray(), (rs, rowNum) -> {
            TopProduct dto = new TopProduct();
            dto.setId(rs.getInt("id"));
            dto.setName(rs.getString("product_name"));
            dto.setSku(rs.getString("product_code"));
            dto.setImage(rs.getString("image_url") != null ? "/images/" + rs.getString("image_url")
                    : "https://via.placeholder.com/40");
            dto.setCategory(rs.getString("category_name"));
            dto.setSoldCount(rs.getInt("soldCount"));
            dto.setTotalRevenue(rs.getDouble("totalRevenue"));
            return dto;
        });
    }

    // 6. Dữ liệu biểu đồ (Map vào RevenueItem của Xếp)
    public List<RevenueItem> getMonthlyStats() {
        return getMonthlyStats(null, null);
    }

    public List<RevenueItem> getMonthlyStats(String startDate, String endDate) {
        List<RevenueItem> stats = new ArrayList<>();
        
        List<Object> params = new ArrayList<>();
        String dateCond = getDateCondition("", startDate, endDate, params);
        
        // Nhóm doanh thu theo ngày
        String sql = "SELECT CAST(created_at AS DATE) as stat_date, " +
                     "SUM(final_amount) as totalRevenue, " +
                     "SUM(CASE WHEN status = 3 THEN final_amount ELSE 0 END) as successfulRevenue, " +
                     "COUNT(id) as totalOrders " +
                     "FROM orders WHERE status = 3 " + dateCond +
                     " GROUP BY CAST(created_at AS DATE) " +
                     "ORDER BY CAST(created_at AS DATE) ASC";

        try {
            jdbc.query(sql, params.toArray(), (rs, rowNum) -> {
                String dateStr = rs.getString("stat_date");
                if (dateStr != null && dateStr.length() >= 10) {
                    dateStr = dateStr.substring(8, 10) + "/" + dateStr.substring(5, 7); // DD/MM
                }
                double revenue = rs.getDouble("totalRevenue");
                // Giả lập percentage bằng cách tính revenue / 1000000 (Chỉ mang tính chất hiển thị)
                int percentage = (int) Math.min(100, revenue / 2000000); 
                stats.add(new RevenueItem(dateStr, percentage > 0 ? percentage : 10, revenue));
                return null;
            });
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (stats.isEmpty()) {
            stats.add(new RevenueItem("Không có", 0, 0));
        }

        return stats;
    }

    // 7. Hoạt động gần đây (Lấy dữ liệu thật từ Orders, Accounts và Inventory)
    public List<Activity> getRecentActivities() {
        List<Activity> activities = new ArrayList<>();

        try {
            // 1. Lấy 3 đơn hàng mới nhất
            String sqlOrders = "SELECT TOP 3 o.order_code, a.full_name, o.created_at " +
                    "FROM orders o JOIN accounts a ON o.user_id = a.id " +
                    "ORDER BY o.created_at DESC";
            jdbc.query(sqlOrders, (rs, rowNum) -> {
                String orderCode = rs.getString("order_code");
                String fullName = rs.getString("full_name");
                
                // Get product names for this order
                String sqlProducts = "SELECT p.product_name " +
                        "FROM order_items oi " +
                        "JOIN orders o ON oi.order_id = o.id " +
                        "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "WHERE o.order_code = ?";
                List<String> productNames = jdbc.query(sqlProducts, (productRs, productRowNum) -> productRs.getString("product_name"), orderCode);
                
                String productsDisplay = "";
                if (productNames != null && !productNames.isEmpty()) {
                    productsDisplay = productNames.get(0);
                    if (productNames.size() > 1) {
                        productsDisplay += " (và " + (productNames.size() - 1) + " sản phẩm khác)";
                    }
                } else {
                    productsDisplay = "#" + orderCode;
                }

                activities.add(new Activity("success",
                        "<strong class='text-white'>" + fullName + "</strong> vừa đặt đơn hàng <strong class='text-white'>" + productsDisplay + "</strong>",
                        formatTimeAgo(rs.getTimestamp("created_at"))));
                return null;
            });

            // 2. Lấy 3 khách hàng mới đăng ký
            String sqlUsers = "SELECT TOP 3 full_name, created_at FROM accounts WHERE role = 'USER' ORDER BY created_at DESC";
            jdbc.query(sqlUsers, (rs, rowNum) -> {
                activities.add(new Activity("info",
                        "<strong class='text-white'>" + rs.getString("full_name") + "</strong> đã đăng ký thành viên.",
                        formatTimeAgo(rs.getTimestamp("created_at"))));
                return null;
            });

            // 3. Cảnh báo kho hàng (3 sản phẩm ít nhất)
            String sqlStock = "SELECT TOP 3 p.product_name, pv.quantity " +
                    "FROM product_variants pv JOIN products p ON pv.product_id = p.id " +
                    "WHERE pv.quantity < 10 ORDER BY pv.quantity ASC";
            jdbc.query(sqlStock, (rs, rowNum) -> {
                activities.add(new Activity("warning",
                        "Cảnh báo: <strong class='text-white'>" + rs.getString("product_name") + "</strong> sắp hết hàng (" + rs.getInt("quantity") + ").",
                        "Ngay bây giờ"));
                return null;
            });

        } catch (Exception e) {
            e.printStackTrace();
        }

        return activities;
    }

    private String formatTimeAgo(java.sql.Timestamp timestamp) {
        if (timestamp == null) return "Vừa xong";
        long diff = System.currentTimeMillis() - timestamp.getTime();
        long diffSeconds = diff / 1000;
        long diffMinutes = diffSeconds / 60;
        long diffHours = diffMinutes / 60;
        long diffDays = diffHours / 24;

        if (diffMinutes < 1) return "Vừa xong";
        if (diffMinutes < 60) return diffMinutes + " phút trước";
        if (diffHours < 24) return diffHours + " giờ trước";
        return diffDays + " ngày trước";
    }
}