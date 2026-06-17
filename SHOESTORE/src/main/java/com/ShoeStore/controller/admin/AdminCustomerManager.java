package com.ShoeStore.controller.admin;

import com.ShoeStore.model.CustomerDTO;
import com.ShoeStore.service.CustomerService;
import com.ShoeStore.service.OrderService;
import com.ShoeStore.repository.MembershipRankRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AdminCustomerManager {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private MembershipRankRepository rankRepo;

    @GetMapping("/admin/customers")
    public String dashBoard(Model model) {
        // Đẩy danh sách khách hàng sang giao diện Thymeleaf
        model.addAttribute("customers", customerService.getAllCustomers());
        model.addAttribute("ranks", rankRepo.findAll());
        return "admin/customers";
    }

    @PostMapping("/admin/customers/update-rank")
    public String updateRank(@RequestParam("userId") Integer userId,
            @RequestParam("rankId") Integer rankId,
            RedirectAttributes ra) {
        customerService.updateCustomerRank(userId, rankId);
        ra.addFlashAttribute("message", "Cập nhật hạng khách hàng thành công!");
        return "redirect:/admin/customers";
    }

    @GetMapping("/admin/customers/detail")
    public String viewCustomerDetail(@RequestParam("id") Integer id, Model model) {
        CustomerDTO customer = customerService.getCustomerById(id);
        if (customer == null) {
            return "redirect:/admin/customers";
        }
        model.addAttribute("customer", customer);
        model.addAttribute("orders", orderService.getOrdersByUserId(id.longValue()));
        return "admin/customer-detail";
    }

    @PostMapping("/admin/customers/toggle-status")
    public String toggleStatus(@RequestParam("id") Integer id,
            @RequestParam("status") Integer status,
            RedirectAttributes ra) {
        customerService.updateCustomerStatus(id, status);
        String msg = (status == 1) ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản thành công!";
        ra.addFlashAttribute("message", msg);
        return "redirect:/admin/customers";
    }

    @PostMapping("/admin/customers/update-role")
    public String updateRole(@RequestParam("userId") Integer userId,
                             @RequestParam("role") String role,
                             RedirectAttributes ra) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            ra.addFlashAttribute("error", "Hành động bị từ chối: Không được phép thao tác với tài khoản ROLE ADMIN.");
            return "redirect:/admin/customers";
        }
        
        customerService.updateCustomerRole(userId, role);
        ra.addFlashAttribute("message", "Đổi quyền (Role) thành công!");
        return "redirect:/admin/customers";
    }
}