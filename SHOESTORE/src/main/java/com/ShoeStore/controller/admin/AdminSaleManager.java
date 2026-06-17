package com.ShoeStore.controller.admin;

import com.ShoeStore.model.MembershipRank;
import com.ShoeStore.model.Voucher;
import com.ShoeStore.repository.MembershipRankRepository;
import com.ShoeStore.service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Controller
@RequestMapping("/admin/sale")
public class AdminSaleManager {

	@Autowired
	private VoucherService voucherService;

	@Autowired
	private MembershipRankRepository rankRepo;

	@GetMapping
	public String index(Model model) {
		model.addAttribute("list", voucherService.getAllVouchers());
		model.addAttribute("ranks", rankRepo.findAll());
		return "admin/sale";
	}

	@PostMapping("/save")
	public String saveVoucher(
			@ModelAttribute Voucher voucher,
			@RequestParam(value = "rankIds", required = false) List<Integer> rankIds,
			@RequestParam(value = "startDateStr", required = false) String startDateStr,
			@RequestParam(value = "endDateStr", required = false) String endDateStr,
			RedirectAttributes ra) {

		try {
			if (startDateStr != null && !startDateStr.isEmpty()) {
				voucher.setStartDate(LocalDateTime.parse(startDateStr));
			}
			if (endDateStr != null && !endDateStr.isEmpty()) {
				voucher.setEndDate(LocalDateTime.parse(endDateStr));
			}

			if (rankIds != null) {
				Set<MembershipRank> ranks = new HashSet<>(rankRepo.findAllById(rankIds));
				voucher.setApplicableRanks(ranks);
			} else {
				voucher.setApplicableRanks(new HashSet<>());
			}

			if (voucher.getStatus() == null) {
				voucher.setStatus(1);
			}
			voucherService.saveVoucher(voucher);
			ra.addFlashAttribute("message", "Lưu voucher thành công!");
		} catch (Exception e) {
			ra.addFlashAttribute("error", "Lỗi: " + e.getMessage());
		}
		return "redirect:/admin/sale";
	}

	@GetMapping("/delete/{id}")
	public String delete(@PathVariable("id") Integer id, RedirectAttributes ra) {
		voucherService.deleteVoucher(id);
		ra.addFlashAttribute("message", "Xóa voucher thành công!");
		return "redirect:/admin/sale";
	}
}
