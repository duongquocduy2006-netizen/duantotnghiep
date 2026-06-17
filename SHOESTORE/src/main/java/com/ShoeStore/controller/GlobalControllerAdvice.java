package com.ShoeStore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import jakarta.servlet.http.HttpSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ControllerAdvice
public class GlobalControllerAdvice {

    @Autowired
    private JdbcTemplate jdbc;

    @SuppressWarnings("unchecked")
    @ModelAttribute("globalFavIds")
    public List<Integer> getFavIds(HttpSession session) {
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account != null) {
            Long accountId = ((Number) account.get("id")).longValue();
            String sql = "SELECT product_id FROM favourites WHERE user_id = ?";
            return jdbc.queryForList(sql, Integer.class, accountId);
        }
        return new ArrayList<>();
    }

    @ModelAttribute("globalCategories")
    public List<Map<String, Object>> getCategories() {
        String sql = "SELECT id, category_name FROM categories WHERE status = 1";
        return jdbc.queryForList(sql);
    }

    @ModelAttribute("globalBrands")
    public List<String> getBrands() {
        String sql = "SELECT brand_name FROM brands WHERE status = 1";
        return jdbc.queryForList(sql, String.class);
    }

    @ModelAttribute("globalSizes")
    public List<Map<String, Object>> getSizes() {
        String sql = "SELECT id, size_name FROM sizes ORDER BY size_name ASC";
        return jdbc.queryForList(sql);
    }

    @ModelAttribute("globalCartCount")
    public int getCartCount(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null)
            return 0;

        try {
            Long accountId = ((Number) account.get("id")).longValue();
            String sql = "SELECT SUM(quantity) FROM cart_items WHERE user_id = ?";
            Integer count = jdbc.queryForObject(sql, Integer.class, accountId);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
