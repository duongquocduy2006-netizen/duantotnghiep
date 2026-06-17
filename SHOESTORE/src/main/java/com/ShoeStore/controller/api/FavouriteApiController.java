package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/favourites")
public class FavouriteApiController {

    @Autowired
    private JdbcTemplate jdbc;

    // 1. LẤY DANH SÁCH SẢN PHẨM YÊU THÍCH CỦA USER ĐANG ĐĂNG NHẬP
    @GetMapping
    public ResponseEntity<?> getMyFavourites(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        Long userId = ((Number) account.get("id")).longValue();

        try {
            String sql = "SELECT p.id, p.product_name, p.brand_name, "
                    + "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, "
                    + "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price "
                    + "FROM products p "
                    + "JOIN favourites f ON p.id = f.product_id "
                    + "WHERE f.user_id = ? AND p.status = 1";

            List<Map<String, Object>> products = jdbc.queryForList(sql, userId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "products", products
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách yêu thích: " + e.getMessage()));
        }
    }

    // 2. LẤY MẢNG ID CÁC SẢN PHẨM ĐÃ YÊU THÍCH (DÙNG ĐỂ BẬT TRÁI TIM Ở TRANG CHỦ/CỬA HÀNG)
    @GetMapping("/ids")
    public ResponseEntity<?> getMyFavouriteIds(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.ok(Map.of("success", true, "ids", List.of()));
        }

        Long userId = ((Number) account.get("id")).longValue();

        try {
            String sql = "SELECT product_id FROM favourites WHERE user_id = ?";
            List<Integer> ids = jdbc.queryForList(sql, Integer.class, userId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "ids", ids
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách ID yêu thích: " + e.getMessage()));
        }
    }

    // 3. THÊM HOẶC XÓA SẢN PHẨM KHỎI YÊU THÍCH (TOGGLE)
    @PostMapping("/toggle")
    public ResponseEntity<?> toggleFavourite(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        if (!payload.containsKey("productId")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu productId!"));
        }

        Integer productId = ((Number) payload.get("productId")).intValue();
        Long userId = ((Number) account.get("id")).longValue();

        try {
            // Kiểm tra xem đã yêu thích chưa
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM favourites WHERE user_id = ? AND product_id = ?",
                    Integer.class, userId, productId
            );

            String action;
            if (count != null && count > 0) {
                // Đã có -> Xóa đi
                jdbc.update("DELETE FROM favourites WHERE user_id = ? AND product_id = ?", userId, productId);
                action = "removed";
            } else {
                // Chưa có -> Thêm mới
                jdbc.update("INSERT INTO favourites (user_id, product_id) VALUES (?, ?)", userId, productId);
                action = "added";
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "action", action,
                    "message", action.equals("added") ? "Đã thêm vào danh sách yêu thích!" : "Đã xóa khỏi danh sách yêu thích!"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xử lý yêu thích: " + e.getMessage()));
        }
    }
}
