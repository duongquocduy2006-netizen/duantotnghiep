package com.ShoeStore.controller.api;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private JdbcTemplate jdbc;

    @PostMapping("/add")
    public Map<String, Object> addReview(
            @RequestParam("productId") Integer productId,
            @RequestParam(value = "rating", required = false) Integer rating,
            @RequestParam("content") String content,
            @RequestParam(value = "parentId", required = false) Integer parentId,
            HttpSession session) {
        
        Map<String, Object> response = new HashMap<>();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        
        if (account == null) {
            response.put("success", false);
            response.put("message", "Vui lòng đăng nhập!");
            return response;
        }
        
        Integer userId = (Integer) account.get("id");

        // Nếu là Đánh giá gốc (Parent) -> Phải mua hàng thành công mới được viết
        if (parentId == null) {
            String sqlCheckPurchase = "SELECT COUNT(*) FROM orders o " +
                    "JOIN order_items oi ON o.id = oi.order_id " +
                    "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                    "WHERE o.user_id = ? AND pv.product_id = ? AND o.status = 3";
            Integer count = jdbc.queryForObject(sqlCheckPurchase, Integer.class, userId, productId);
            if (count == null || count == 0) {
                response.put("success", false);
                response.put("message", "Bạn cần mua hàng thành công để có thể đánh giá sản phẩm này.");
                return response;
            }
        }
        // Nếu là Phản hồi (Child) -> Chỉ cần có tài khoản (đã login check ở trên) là được
        
        try {
            String sql = "INSERT INTO product_reviews (product_id, user_id, rating, content, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)";
            int finalRating = (rating == null || rating <= 0) ? 5 : rating;
            jdbc.update(sql, productId, userId, finalRating, content, new Date(), parentId);
            
            // Lấy ID vừa insert và thông tin hiển thị
            Long newId = jdbc.queryForObject("SELECT @@IDENTITY", Long.class);
            
            response.put("success", true);
            response.put("message", parentId == null ? "Cảm ơn bạn đã đánh giá sản phẩm!" : "Đã gửi phản hồi của bạn!");
            
            // Trả về thêm thông tin để UI render ko cần reload
            response.put("id", newId);
            response.put("userId", userId);
            response.put("userName", account.get("full_name") != null ? account.get("full_name") : account.get("username"));
            response.put("role", account.get("role"));
            response.put("createdAt", new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date()));
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Có lỗi xảy ra: " + e.getMessage());
        }
        
        return response;
    }

    @PostMapping("/like")
    public Map<String, Object> likeReview(@RequestParam("id") Integer id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        
        if (account == null) {
            response.put("success", false);
            response.put("message", "Vui lòng đăng nhập để Thích!");
            return response;
        }
        
        Integer userId = (Integer) account.get("id");
        
        try {
            // Kiểm tra đã like chưa
            String checkSql = "SELECT COUNT(*) FROM product_review_likes WHERE review_id = ? AND user_id = ?";
            Integer count = jdbc.queryForObject(checkSql, Integer.class, id, userId);
            
            if (count != null && count > 0) {
                // Đã like -> Unlike
                jdbc.update("DELETE FROM product_review_likes WHERE review_id = ? AND user_id = ?", id, userId);
                jdbc.update("UPDATE product_reviews SET like_count = like_count - 1 WHERE id = ?", id);
                response.put("liked", false);
            } else {
                // Chưa like -> Like
                jdbc.update("INSERT INTO product_review_likes (review_id, user_id) VALUES (?, ?)", id, userId);
                jdbc.update("UPDATE product_reviews SET like_count = like_count + 1 WHERE id = ?", id);
                response.put("liked", true);
            }
            
            // Trả về số lượng like mới
            Integer newCount = jdbc.queryForObject("SELECT like_count FROM product_reviews WHERE id = ?", Integer.class, id);
            response.put("success", true);
            response.put("likeCount", newCount);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/delete")
    public Map<String, Object> deleteReview(@RequestParam("id") Integer id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        
        if (account == null) {
            response.put("success", false);
            response.put("message", "Hết phiên làm việc, vui lòng đăng nhập lại!");
            return response;
        }

        try {
            Map<String, Object> review = jdbc.queryForMap("SELECT user_id FROM product_reviews WHERE id = ?", id);
            Integer authorId = (Integer) review.get("user_id");
            Integer currentUserId = (Integer) account.get("id");
            String role = (String) account.get("role");

            // Quyền xóa: Chủ sở hữu hoặc Admin
            if (currentUserId.equals(authorId) || "ADMIN".equals(role)) {
                // Xóa cả các likes liên quan và phản hồi nếu có
                jdbc.update("DELETE FROM product_review_likes WHERE review_id = ?", id);
                jdbc.update("DELETE FROM product_reviews WHERE parent_id = ?", id);
                jdbc.update("DELETE FROM product_reviews WHERE id = ?", id);
                
                response.put("success", true);
                response.put("message", "Đã xóa bình luận!");
            } else {
                response.put("success", false);
                response.put("message", "Bạn không có quyền xóa bình luận này!");
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi: " + e.getMessage());
        }
        return response;
    }
}
