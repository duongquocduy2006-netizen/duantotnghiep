package com.ShoeStore.controller.admin;

import com.ShoeStore.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model; 
import org.springframework.web.bind.annotation.GetMapping;

import java.time.Year;

@Controller
public class AdminDashboardController {

    // Tiêm DashboardService vào để lấy dữ liệu từ Database
    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private com.ShoeStore.repository.ColorRepository colorRepository;
    
    @Autowired
    private com.ShoeStore.repository.SizeRepository sizeRepository;

    @GetMapping("/admin/dashboard")
    public String dashBoard(Model model) { 
        // Auto-repair corrupted attributes on dashboard load
        try {
            colorRepository.findAll().forEach(c -> {
                String name = c.getColorName();
                if (name != null) {
                    String upper = name.toUpperCase();
                    if (upper.contains("?") || upper.equals("HNG") || upper.equals("TRNG")) {
                        if (upper.startsWith("H")) c.setColorName("H\u1ed3ng");
                        else if (upper.startsWith("TR")) c.setColorName("Tr\u1eafng");
                        else if (upper.startsWith("\u0110") && (upper.contains("?") || upper.length() < 3)) c.setColorName("\u0110\u1ecf");
                        colorRepository.save(c);
                    }
                }
            });
        } catch (Exception e) {}
        
        // 1. Cập nhật 4 thẻ chỉ số tổng quan bằng dữ liệu thật từ SQL
        model.addAttribute("totalRevenue", dashboardService.getTotalRevenue());
        model.addAttribute("newOrdersCount", dashboardService.getNewOrdersCount());
        model.addAttribute("lowStockCount", dashboardService.getLowStockCount());
        model.addAttribute("newCustomersCount", dashboardService.getNewCustomersCount());
        
        // Cập nhật mốc thời gian linh động theo năm hiện tại
        model.addAttribute("currentTimeRange", "Tháng này");
        model.addAttribute("currentYear", Year.now().getValue());

        // 2. BƠM THÊM 3 DANH SÁCH NÀY ĐỂ GIAO DIỆN CÓ THỂ HIỂN THỊ (QUAN TRỌNG)
        // Nếu thiếu 3 dòng này, biểu đồ và bảng sản phẩm sẽ báo "Chưa có dữ liệu"
        model.addAttribute("monthlyStats", dashboardService.getMonthlyStats());
        model.addAttribute("recentActivities", dashboardService.getRecentActivities());
        model.addAttribute("topProducts", dashboardService.getTopProducts());

        return "admin/dashboard";
    }
}