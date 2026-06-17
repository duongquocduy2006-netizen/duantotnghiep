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
            ra.addFlashAttribute("message",
                    "Xóa hạng thành viên thành công! Các khách hàng cũ đã được chuyển về hạng mặc định.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", "Lỗi khi xóa hạng: " + e.getMessage());
        }
        return "redirect:/admin/ranks";
    }
}
