package com.ShoeStore.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@Controller
public class CartController {

	// Chỉ trả template trống, dữ liệu sẽ được load từ API /api/cart bằng JS
	@GetMapping("/cart")
	public String cart(HttpSession session) {
		@SuppressWarnings("unchecked")
		Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
		if (account == null) {
			return "redirect:/login";
		}
		return "client/cart";
	}
}
