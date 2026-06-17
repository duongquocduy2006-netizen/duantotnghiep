package com.ShoeStore.controller.admin;

import com.ShoeStore.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AdminOrderManager {

    @Autowired
    private OrderService orderService;

    @GetMapping("/admin/orders")
    public String dashBoard(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) Integer status,
            Model model) {

        // Ném danh sách đơn hàng sang View (Thymeleaf) có filter
        model.addAttribute("orders", orderService.getAllOrders(keyword, status));
        model.addAttribute("keyword", keyword);
        model.addAttribute("statusFilter", status);

        return "admin/orders";
    }

    @PostMapping("/admin/orders/update-status")
    public String updateStatus(
            @RequestParam("orderCode") String orderCode,
            @RequestParam("status") int status,
            org.springframework.web.servlet.mvc.support.RedirectAttributes ra) {

        if (status == 3) {
            // Kiểm tra trạng thái hiện tại từ DB
            try {
                int currentStatus = orderService.getOrderStatus(orderCode);
                if (currentStatus != 5) {
                    ra.addFlashAttribute("error",
                            "Admin chỉ có thể xác nhận 'Thành công' sau khi khách hàng đã nhấn 'Đã nhận hàng' (Trạng thái: Chờ duyệt).");
                    return "redirect:/admin/orders";
                }
            } catch (Exception e) {
                ra.addFlashAttribute("error", "Không tìm thấy đơn hàng.");
                return "redirect:/admin/orders";
            }
        }

        orderService.updateOrderStatus(orderCode, status);
        return "redirect:/admin/orders?success=status_updated";
    }
}