package com.ShoeStore.controller.admin;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.ShoeStore.model.MembershipRank;
import com.ShoeStore.repository.MembershipRankRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/ranks")
public class AdminRankManager {

    @Autowired
    private MembershipRankRepository rankRepo;

    @Autowired
    private JdbcTemplate jdbc;

    @jakarta.annotation.PostConstruct
    public void initSchema() {
        try {
            // Thử thêm cột nếu chưa có
            jdbc.execute("ALTER TABLE membership_ranks ADD color_code NVARCHAR(20) DEFAULT '#94a3b8'");
        } catch (Exception e) {
            // Nếu đã có, thì thử tăng kích thước lên
            try {
                jdbc.execute("ALTER TABLE membership_ranks ALTER COLUMN color_code NVARCHAR(20)");
            } catch (Exception e2) {
                // Ignore
            }
        }
    }

    @GetMapping
    public String index(Model model) {
        String sql = "SELECT r.*, " +
                "(SELECT STRING_AGG(v.code, ', ') FROM vouchers v " +
                " JOIN voucher_membership_ranks vr ON v.id = vr.voucher_id " +
                " WHERE vr.rank_id = r.id) as voucher_codes " +
                "FROM membership_ranks r";
        List<Map<String, Object>> ranksWithVouchers = jdbc.queryForList(sql);
        model.addAttribute("list", ranksWithVouchers);
        return "admin/ranks";
    }

    @GetMapping("/add")
    public String addForm(Model model) {
        model.addAttribute("rank", new MembershipRank());
        return "admin/add-ranks";
    }

    @PostMapping("/add")
    public String saveAdd(@ModelAttribute("rank") MembershipRank rank, Model model) {
        rankRepo.save(rank);
        recalculateUserRanks();
        model.addAttribute("message", "Thêm hạng thành viên mới thành công!");
        model.addAttribute("rank", new MembershipRank());
        return "admin/add-ranks";
    }

    @GetMapping("/edit/{id}")
    public String editForm(@PathVariable("id") Integer id, Model model) {
        MembershipRank rank = rankRepo.findById(id).orElse(null);
        if (rank != null) {
            model.addAttribute("rank", rank);
            return "admin/add-ranks"; // Reusing add-ranks for edit
        }
        return "redirect:/admin/ranks";
    }

    @PostMapping("/edit/{id}")
    public String saveUpdate(@PathVariable("id") Integer id, @ModelAttribute("rank") MembershipRank rank, Model model) {
        rank.setId(id);
        rankRepo.save(rank);
        recalculateUserRanks();
        model.addAttribute("message", "Cập nhật hạng thành viên thành công!");
        model.addAttribute("rank", rank);
        return "admin/add-ranks";
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable("id") Integer id, RedirectAttributes ra) {
        if (id == 1) {
            ra.addFlashAttribute("error", "Không thể xóa hạng mặc định!");
            return "redirect:/admin/ranks";
        }
        try {
            // Chuyển tất cả khách hàng thuộc hạng này về hạng mặc định (ID = 1)
            jdbc.update("UPDATE accounts SET membership_rank_id = 1 WHERE membership_rank_id = ?", id);

            rankRepo.deleteById(id);
            recalculateUserRanks();
            ra.addFlashAttribute("message",
                    "Xóa hạng thành viên thành công! Các khách hàng cũ đã được cập nhật lại hạng phù hợp.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", "Lỗi khi xóa hạng: " + e.getMessage());
        }
        return "redirect:/admin/ranks";
    }

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
}
