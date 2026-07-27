package com.ShoeStore;

import com.ShoeStore.service.OrderService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
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
        // Chạy lần đầu khi ứng dụng khởi động
        autoCompleteDeliveredOrders();
    }

    /**
     * Chạy mỗi 1 giờ (3600000ms) để tự động hoàn tất các đơn hàng
     * đã giao (status=5) quá 3 ngày.
     */
    @Scheduled(fixedRate = 3600000)
    public void scheduledAutoComplete() {
        autoCompleteDeliveredOrders();
    }

    private void autoCompleteDeliveredOrders() {
        System.out.println("--- AUTO-COMPLETING ORDERS TASK ---");

        // Tìm các đơn hàng ở trạng thái 5 (Đã giao) và đã quá 3 ngày
        // kể từ lúc chuyển sang trạng thái Đã giao (dùng updated_at, fallback created_at)
        String sql = "SELECT order_code FROM orders " +
                "WHERE status = 5 AND DATEDIFF(day, ISNULL(updated_at, created_at), GETDATE()) >= 3";

        try {
            List<String> codes = jdbc.queryForList(sql, String.class);

            if (codes.isEmpty()) {
                System.out.println("Không có đơn hàng nào cần tự động hoàn tất.");
            } else {
                for (String code : codes) {
                    try {
                        System.out.println("Tự động hoàn tất đơn hàng: " + code);
                        orderService.updateOrderStatus(code, 3);
                    } catch (Exception e) {
                        System.err.println("Lỗi khi hoàn tất đơn " + code + ": " + e.getMessage());
                    }
                }
                System.out.println("Đã tự động hoàn tất " + codes.size() + " đơn hàng.");
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi chạy quét đơn hàng tự động: " + e.getMessage());
        }
    }
}
