package com.ShoeStore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class FavouriteController {

    @Autowired
    private JdbcTemplate jdbc;

    @SuppressWarnings("unchecked")
    @GetMapping("/favourites")
    public String favourites(HttpSession session, Model model) {
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return "redirect:/login";
        }

        Long accountId = ((Number) account.get("id")).longValue();
        String sql = "SELECT p.id, p.product_name, p.brand_name, " +
                "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, "
                +
                "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price " +
                "FROM products p " +
                "JOIN favourites f ON p.id = f.product_id " +
                "LEFT JOIN categories c ON p.category_id = c.id " +
                "WHERE f.user_id = ? AND p.status = 1 AND c.status = 1 " +
                "AND EXISTS (SELECT 1 FROM brands b WHERE b.brand_name = p.brand_name AND b.status = 1)";

        List<Map<String, Object>> favouriteProducts = jdbc.queryForList(sql, accountId);
        model.addAttribute("products", favouriteProducts);

        return "client/favourites";
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/favourites/toggle")
    @ResponseBody
    public Map<String, Object> toggleFavourite(@RequestParam("productId") Integer productId, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            response.put("success", false);
            response.put("message", "Chưa đăng nhập");
            return response;
        }

        Long accountId = ((Number) account.get("id")).longValue();

        try {
            // Kiểm tra xem đã thích chưa
            String checkSql = "SELECT count(*) FROM favourites WHERE user_id = ? AND product_id = ?";
            Integer count = jdbc.queryForObject(checkSql, Integer.class, accountId, productId);

            if (count != null && count > 0) {
                // Đã thích -> Xóa
                String deleteSql = "DELETE FROM favourites WHERE user_id = ? AND product_id = ?";
                jdbc.update(deleteSql, accountId, productId);
                response.put("status", "removed");
            } else {
                // Chưa thích -> Thêm
                String insertSql = "INSERT INTO favourites (user_id, product_id) VALUES (?, ?)";
                jdbc.update(insertSql, accountId, productId);
                response.put("status", "added");
            }
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi hệ thống: " + e.getMessage());
        }

        return response;
    }
}