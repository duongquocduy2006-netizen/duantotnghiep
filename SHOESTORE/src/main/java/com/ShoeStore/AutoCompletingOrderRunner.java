package com.ShoeStore;

import com.ShoeStore.service.OrderService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class AutoCompletingOrderRunner implements CommandLineRunner {

    private final JdbcTemplate jdbc;
    private final OrderService orderService;

    public AutoCompletingOrderRunner(JdbcTemplate jdbc, OrderService orderService) {
        this.jdbc = jdbc;
        this.orderService = orderService;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- AUTO-COMPLETING ORDERS TASK ---");

        // Tìm các đơn hàng đang ở trạng thái 2 (Shipping) và đã quá 3 ngày kể từ lúc
        // tạo
        // (Hoặc nếu có updated_at thì dùng updated_at sẽ chuẩn hơn)
        String sql = "SELECT order_code FROM orders " +
                "WHERE status = 2 AND DATEDIFF(day, created_at, GETDATE()) >= 3";

        try {
            List<String> codes = jdbc.queryForList(sql, String.class);

            if (codes.isEmpty()) {
                System.out.println("Không có đơn hàng nào cần tự động hoàn tất.");
            } else {
                for (String code : codes) {
                    System.out.println("Tự động hoàn tất đơn hàng: " + code);
                    orderService.updateOrderStatus(code, 3);
                }
                System.out.println("Đã tự động hoàn tất " + codes.size() + " đơn hàng.");
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi chạy quét đơn hàng tự động: " + e.getMessage());
        }
    }
}
