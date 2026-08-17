package com.ShoeStore.controller.api;

import com.ShoeStore.model.MembershipRank;
import com.ShoeStore.repository.MembershipRankRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/membership")
public class MembershipApiController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MembershipRankRepository rankRepo;

    @GetMapping
    public ResponseEntity<?> getMembershipData(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
        
        // 1. Check if user is logged in
        if (sessionAccount == null) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "loggedIn", false,
                    "message", "Bạn chưa đăng nhập!"
            ));
        }

        try {
            String email = (String) sessionAccount.get("email");

            // 2. Fetch fresh user account details joined with membership rank
            String accountSql = "SELECT a.id, a.user_code, a.full_name, a.email, a.phone, a.points, a.membership_rank_id, r.rank_name, r.color_code "
                    + "FROM accounts a "
                    + "LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id "
                    + "WHERE a.email = ?";
            
            Map<String, Object> freshAccount = jdbc.queryForMap(accountSql, email);

            // Handle potential null values nicely
            Map<String, Object> accountMap = new HashMap<>(freshAccount);
            if (accountMap.get("phone") == null) accountMap.put("phone", "");
            if (accountMap.get("full_name") == null) accountMap.put("full_name", "");
            if (accountMap.get("points") == null) accountMap.put("points", 0);

            // Dynamically verify user rank against current min_points thresholds
            int userPoints = accountMap.get("points") != null ? ((Number) accountMap.get("points")).intValue() : 0;
            List<Map<String, Object>> allRanksDesc = jdbc.queryForList("SELECT id, rank_name, color_code, min_points FROM membership_ranks ORDER BY min_points DESC");
            int calculatedRankId = 1;
            String calculatedRankName = "Đồng";
            String calculatedColorCode = "#94a3b8";

            for (Map<String, Object> r : allRanksDesc) {
                int minPts = ((Number) r.get("min_points")).intValue();
                if (userPoints >= minPts) {
                    calculatedRankId = ((Number) r.get("id")).intValue();
                    calculatedRankName = (String) r.get("rank_name");
                    calculatedColorCode = (String) r.get("color_code");
                    break;
                }
            }

            if (accountMap.get("membership_rank_id") == null || ((Number) accountMap.get("membership_rank_id")).intValue() != calculatedRankId) {
                long uId = ((Number) accountMap.get("id")).longValue();
                jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", calculatedRankId, uId);
                accountMap.put("membership_rank_id", calculatedRankId);
                accountMap.put("rank_name", calculatedRankName);
                accountMap.put("color_code", calculatedColorCode);
            }

            // 3. Fetch all membership ranks ordered by min_points
            String ranksSql = "SELECT id, rank_name as rankName, min_points as minPoints, color_code as colorCode, discount_percent as discountPercent, description, status, free_shipping as freeShipping "
                    + "FROM membership_ranks "
                    + "ORDER BY min_points ASC";
            List<Map<String, Object>> ranks = jdbc.queryForList(ranksSql);

            // 4. Fetch available active vouchers based on member's rank
            int rankId = 1;
            if (accountMap.get("membership_rank_id") != null) {
                rankId = ((Number) accountMap.get("membership_rank_id")).intValue();
            }

            String vouchersSql = "SELECT DISTINCT v.id, v.code, v.discount_value, v.discount_type, v.max_discount, "
                    + "v.min_order_value, v.start_date, v.end_date, v.quantity "
                    + "FROM vouchers v "
                    + "LEFT JOIN voucher_membership_ranks vmr ON v.id = vmr.voucher_id "
                    + "WHERE v.status = 1 AND v.quantity > 0 "
                    + "AND (v.start_date IS NULL OR GETDATE() >= v.start_date) "
                    + "AND (v.end_date IS NULL OR GETDATE() <= v.end_date) "
                    + "AND (vmr.rank_id IS NULL OR vmr.rank_id = ?)";
            
            List<Map<String, Object>> vouchers = jdbc.queryForList(vouchersSql, rankId);

            // 5. Construct successful response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("loggedIn", true);
            response.put("account", accountMap);
            response.put("ranks", ranks);
            response.put("vouchers", vouchers);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tải thông tin hội viên: " + e.getMessage()));
        }
    }

    // ==================== LẤY CHI TIẾT HẠNG ====================
    @GetMapping("/ranks/{id}")
    public ResponseEntity<?> getRankById(@PathVariable Integer id) {
        return rankRepo.findById(id)
                .map(rank -> ResponseEntity.ok(Map.of("success", true, "rank", rank)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ==================== LƯU HOẶC CẬP NHẬT HẠNG ====================
    @PostMapping("/ranks")
    public ResponseEntity<?> saveOrUpdateRank(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = (Integer) payload.get("id");
            String rankName = (String) payload.get("rankName");
            Integer minPoints = payload.get("minPoints") != null ? ((Number) payload.get("minPoints")).intValue() : null;
            String colorCode = (String) payload.get("colorCode");
            Double discountPercent = payload.get("discountPercent") != null ? Double.valueOf(payload.get("discountPercent").toString()) : null;
            String description = (String) payload.get("description");
            Integer status = payload.get("status") != null ? ((Number) payload.get("status")).intValue() : null;
            Boolean freeShipping = (Boolean) payload.get("freeShipping");

            if (rankName == null || rankName.trim().isEmpty() || minPoints == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu thông tin bắt buộc (tên hạng, điểm tối thiểu)!"));
            }

            MembershipRank rank;
            if (id != null) {
                rank = rankRepo.findById(id).orElse(new MembershipRank());
            } else {
                rank = new MembershipRank();
                if (discountPercent == null) discountPercent = 0.0;
                if (status == null) status = 1;
            }

            rank.setRankName(rankName.trim());
            rank.setMinPoints(minPoints);
            rank.setColorCode(colorCode != null ? colorCode.trim() : "#94a3b8");
            if (discountPercent != null) {
                rank.setDiscountPercent(discountPercent);
            }
            if (description != null) {
                rank.setDescription(description.trim());
            }
            if (status != null) {
                rank.setStatus(status);
            }
            if (freeShipping != null) {
                rank.setFreeShipping(freeShipping);
            } else if (id == null) {
                rank.setFreeShipping(false);
            }

            rankRepo.save(rank);
            
            // Tự động cập nhật lại Hạng (Rank) cho tất cả người dùng dựa trên ngưỡng điểm mới
            recalculateUserRanks();

            return ResponseEntity.ok(Map.of("success", true, "message", "Lưu hạng và cập nhật rank người dùng thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu hạng: " + e.getMessage()));
        }
    }

    // ==================== HÀM TÍNH LẠI HẠNG CHO TOÀN BỘ USER ====================
    private void recalculateUserRanks() {
        try {
            List<Map<String, Object>> ranks = jdbc.queryForList(
                    "SELECT id, min_points FROM membership_ranks ORDER BY min_points DESC");
            if (ranks.isEmpty()) return;

            List<Map<String, Object>> accounts = jdbc.queryForList("SELECT id, COALESCE(points, 0) as points FROM accounts");

            for (Map<String, Object> acc : accounts) {
                Object idObj = acc.get("id");
                if (idObj == null) continue;
                long userId = ((Number) idObj).longValue();
                int points = acc.get("points") != null ? ((Number) acc.get("points")).intValue() : 0;

                int newRankId = 1;
                for (Map<String, Object> r : ranks) {
                    int minPoints = ((Number) r.get("min_points")).intValue();
                    if (points >= minPoints) {
                        newRankId = ((Number) r.get("id")).intValue();
                        break;
                    }
                }
                jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", newRankId, userId);
            }
        } catch (Exception e) {
            System.err.println("Lỗi tính lại hạng thành viên: " + e.getMessage());
        }
    }

    // ==================== XÓA HẠNG ====================
    @DeleteMapping("/ranks/{id}")
    public ResponseEntity<?> deleteRank(@PathVariable Integer id) {
        if (id == 1) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Không thể xóa hạng mặc định!"));
        }
        try {
            // Chuyển tất cả khách hàng thuộc hạng này về hạng mặc định (ID = 1)
            jdbc.update("UPDATE accounts SET membership_rank_id = 1 WHERE membership_rank_id = ?", id);
            
            rankRepo.deleteById(id);
            recalculateUserRanks();
            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa hạng thành viên thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi khi xóa hạng: " + e.getMessage()));
        }
    }
}
