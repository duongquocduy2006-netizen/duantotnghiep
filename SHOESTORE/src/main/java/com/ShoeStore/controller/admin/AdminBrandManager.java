package com.ShoeStore.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller này nay chỉ làm nhiệm vụ Routing trả về View (HTML Template) SPA.
 * Dữ liệu CRUD sẽ được xử lý qua API bởi BrandApiController.
 */
@Controller
@RequestMapping("/admin/brands")
public class AdminBrandManager {

    @GetMapping
    public String index() {
        return "admin/brands"; 
    }
}
