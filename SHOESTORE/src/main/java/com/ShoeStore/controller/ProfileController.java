package com.ShoeStore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.dao.EmptyResultDataAccessException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.List;

@Controller

public class ProfileController {

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private com.ShoeStore.service.OrderService orderService;

	@SuppressWarnings("unchecked")
	@GetMapping("/profile")
	public String viewProfile(HttpSession session, Model model) {
		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null) {
			return "redirect:/login"; // Cần đăng nhập
		}

		try {
			Object emailObj = sessionAccount.get("email");
			if (emailObj == null) {
				// Nếu session bị hỏng/lỗi thiếu email, bắt đăng nhập lại
				session.invalidate();
				return "redirect:/login?error=invalid_session";
			}
			String email = emailObj.toString();

			String sql = "SELECT a.id, a.user_code, a.full_name, a.email, a.phone, a.status, a.role, a.points, a.membership_rank_id, r.rank_name "
					+
					"FROM accounts a " +
					"LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id " +
					"WHERE a.email = ?";
			Map<String, Object> freshAccount = jdbc.queryForMap(sql, email);

			// Xử lý giá trị null thành chuỗi rỗng để giao diện không bị lỗi nếu DB chưa có
			// SĐT
			if (freshAccount.get("phone") == null) {
				freshAccount.put("phone", "");
			}
			if (freshAccount.get("full_name") == null) {
				freshAccount.put("full_name", "");
			}

			model.addAttribute("accountInfo", freshAccount);

			return "client/profile";
		} catch (EmptyResultDataAccessException e) {
			// Tài khoản không còn tồn tại trong CSDL nhưng Session vẫn còn lưu -> Xóa
			// session cũ và bắt login lại
			session.invalidate();
			return "redirect:/login?error=account_deleted";
		} catch (Exception e) {
			System.out.println("Lỗi khi tải Profile: " + e.getMessage());
			e.printStackTrace();
			return "redirect:/?error=profile_load_failed"; // Lỗi db trả về home
		}
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/profile/update")
	public String processProfileUpdate(
			@RequestParam(value = "fullName", required = false) String fullName,
			@RequestParam(value = "phone", required = false) String phone,
			HttpSession session) {

		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null)
			return "redirect:/login";

		try {
			Long accountId = ((Number) sessionAccount.get("id")).longValue();

			String updateSql = "UPDATE accounts SET full_name = ?, phone = ? WHERE id = ?";
			jdbc.update(updateSql, fullName, phone, accountId);

			// Cập nhật session
			sessionAccount.put("full_name", fullName);
			sessionAccount.put("phone", phone);
			session.setAttribute("account", sessionAccount);

			return "redirect:/profile?success=true";
		} catch (Exception e) {
			System.out.println("Lỗi khi cập nhật Profile: " + e.getMessage());
			e.printStackTrace();
			return "redirect:/profile?error=true";
		}
	}

	@SuppressWarnings("unchecked")
	@GetMapping("/orders")
	public String viewOrders(HttpSession session, Model model) {
		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null) {
			return "redirect:/login";
		}

		try {
			Long accountId = ((Number) sessionAccount.get("id")).longValue();

			// Lấy thông tin tài khoản tươi mới (có kèm hạng thẻ, điểm)
			String sql = "SELECT a.*, r.rank_name FROM accounts a " +
					"LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id " +
					"WHERE a.id = ?";
			Map<String, Object> freshAccount = jdbc.queryForMap(sql, accountId);
			model.addAttribute("account", freshAccount);

			// Lấy danh sách đơn hàng
			model.addAttribute("orders", orderService.getOrdersByUserId(accountId));

			return "client/orders";
		} catch (Exception e) {
			e.printStackTrace();
			return "redirect:/?error=orders_load_failed";
		}
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/orders/confirm")
	public String processConfirmOrder(
			@RequestParam("orderCode") String orderCode,
			HttpSession session,
			org.springframework.web.servlet.mvc.support.RedirectAttributes ra) {

		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null)
			return "redirect:/login";

		try {
			Long accountId = ((Number) sessionAccount.get("id")).longValue();
			orderService.confirmOrder(orderCode, accountId);
			
			// Lấy SP đầu tiên để gợi ý đánh giá
			List<Map<String, Object>> items = orderService.getOrderItems(orderCode);
			if (!items.isEmpty()) {
				ra.addFlashAttribute("confirmedOrderProductId", items.get(0).get("product_id"));
				ra.addFlashAttribute("confirmedOrderProductName", items.get(0).get("product_name"));
			}

			ra.addFlashAttribute("message", "Xác nhận nhận hàng thành công! Cám ơn bạn đã lựa chọn chúng tôi.");
			ra.addFlashAttribute("showReviewModal", true);
			ra.addFlashAttribute("confirmedOrderCode", orderCode);
		} catch (Exception e) {
			ra.addFlashAttribute("error", "Lỗi: " + e.getMessage());
		}
		return "redirect:/orders";
	}

	@SuppressWarnings("unchecked")
	@GetMapping("/orders/detail/{orderCode}")
	public String viewOrderDetail(
			@PathVariable("orderCode") String orderCode,
			HttpSession session,
			Model model) {

		Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
		if (account == null)
			return "redirect:/login";

		try {
			Long userId = ((Number) account.get("id")).longValue();

			// 1. Load order info
			Map<String, Object> order = orderService.getOrderDetail(orderCode);
			
			if (order == null) {
				return "redirect:/orders?error=order_not_found";
			}
			
			Long orderUserId = ((Number) order.get("user_id")).longValue();

			// 2. Check ownership
			if (!userId.equals(orderUserId)) {
				return "redirect:/orders?error=unauthorized";
			}

			model.addAttribute("order", order);
			model.addAttribute("items", orderService.getOrderItems(orderCode));
			model.addAttribute("account", account); // For sidebar/header

			return "client/order-detail";
		} catch (Exception e) {
			e.printStackTrace();
			return "redirect:/orders?error=order_not_found";
		}
	}

	@GetMapping("/change-password")
	public String viewChangePassword(HttpSession session) {
		if (session.getAttribute("account") == null) {
			return "redirect:/login";
		}
		return "client/change-password";
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/profile/change-password")
	public String processChangePassword(
			@RequestParam("oldPassword") String oldPassword,
			@RequestParam("newPassword") String newPassword,
			@RequestParam("confirmPassword") String confirmPassword,
			HttpSession session,
			Model model) {

		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null) {
			return "redirect:/login";
		}

		// 1. Kiểm tra khớp mật khẩu mới
		if (!newPassword.equals(confirmPassword)) {
			model.addAttribute("error", "Mật khẩu xác nhận không khớp!");
			return "client/change-password";
		}

		try {
			Long accountId = ((Number) sessionAccount.get("id")).longValue();

			// 2. Lấy mật khẩu hiện tại từ DB để so sánh
			String sql = "SELECT password FROM accounts WHERE id = ?";
			String currentDbPass = jdbc.queryForObject(sql, String.class, accountId);

			if (!oldPassword.equals(currentDbPass)) {
				model.addAttribute("error", "Mật khẩu hiện tại không chính xác!");
				return "client/change-password";
			}

			// 3. Cập nhật mật khẩu mới
			String updateSql = "UPDATE accounts SET password = ? WHERE id = ?";
			jdbc.update(updateSql, newPassword, accountId);

			model.addAttribute("success", "Đổi mật khẩu thành công!");
			return "client/change-password";

		} catch (Exception e) {
			model.addAttribute("error", "Lỗi hệ thống: " + e.getMessage());
			return "client/change-password";
		}
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/orders/cancel")
	public String processCancelOrder(
			@RequestParam("orderCode") String orderCode,
			HttpSession session,
			org.springframework.web.servlet.mvc.support.RedirectAttributes ra) {

		Map<String, Object> sessionAccount = (Map<String, Object>) session.getAttribute("account");
		if (sessionAccount == null)
			return "redirect:/login";

		try {
			Long accountId = ((Number) sessionAccount.get("id")).longValue();
			orderService.cancelOrder(orderCode, accountId);
			ra.addFlashAttribute("message", "Hủy đơn hàng thành công.");
		} catch (Exception e) {
			ra.addFlashAttribute("error", "Lỗi hủy đơn: " + e.getMessage());
		}
		return "redirect:/orders";
	}
}