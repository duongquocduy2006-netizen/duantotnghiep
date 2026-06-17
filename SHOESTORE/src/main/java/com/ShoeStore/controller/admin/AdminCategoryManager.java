package com.ShoeStore.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller này nay chỉ làm nhiệm vụ Routing trả về View (HTML Template).
 * Toàn bộ Dữ liệu sẽ được nạp qua API bởi CategoryApiController theo kiến trúc AJAX (SPA).
 */
@Controller
@RequestMapping("/admin/categories")
public class AdminCategoryManager {

    @GetMapping
    public String index() {
        return "admin/categories"; 
    }
}