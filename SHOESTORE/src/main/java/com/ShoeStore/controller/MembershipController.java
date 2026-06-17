package com.ShoeStore.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpSession;

@Controller
public class MembershipController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private com.ShoeStore.service.OrderService orderService;

    @GetMapping("/membership")
    public String member(HttpSession session, Model model) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return "redirect:/login";
        }

        try {
            Long userId = ((Number) account.get("id")).longValue();

            // Tự động cập nhật hạng nếu đủ điểm
            orderService.updateUserRank(userId);

            // Fetch fresh data from DB to get latest points and rank
            String sql = "SELECT a.*, mr.rank_name, mr.color_code FROM accounts a " +
                    "LEFT JOIN membership_ranks mr ON a.membership_rank_id = mr.id " +
                    "WHERE a.id = ?";
            Map<String, Object> fullAccount = jdbc.queryForMap(sql, userId);

            // Lấy danh sách tất cả các hạng để tính toán "Tiếp theo"
            List<Map<String, Object>> allRanks = jdbc
                    .queryForList("SELECT * FROM membership_ranks ORDER BY min_points ASC");

            // Tính toán chỉ số hạng hiện tại trong Java để tránh lỗi Thymeleaf
            // #lists.indexOf
            int currentRankId = ((Number) fullAccount.get("membership_rank_id")).intValue();
            int currentRankIdx = -1;
            for (int i = 0; i < allRanks.size(); i++) {
                if (((Number) allRanks.get(i).get("id")).intValue() == currentRankId) {
                    currentRankIdx = i;
                    break;
                }
            }

            model.addAttribute("account", fullAccount);
            model.addAttribute("allRanks", allRanks);
            model.addAttribute("currentRankIdx", currentRankIdx);
        } catch (Exception e) {
            // Fallback to session account if DB query fails for some reason
            model.addAttribute("account", account);
        }

        return "client/membership";
    }
}
