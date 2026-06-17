package com.ShoeStore.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminSettingManager {
	@GetMapping("/admin/settings")
	public String products() {
		return "admin/settings";
	}

}
