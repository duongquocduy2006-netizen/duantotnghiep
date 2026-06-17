package com.ShoeStore.controller.shipper;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/shipper")
public class ShipperController {

    @GetMapping({"", "/", "/dashboard"})
    public String dashboard(org.springframework.ui.Model model) {
        model.addAttribute("page", "dashboard");
        return "shipper/dashboard";
    }

    @GetMapping("/waiting-orders")
    public String waitingOrders(org.springframework.ui.Model model) {
        model.addAttribute("page", "waiting");
        return "shipper/waiting_orders";
    }

    @GetMapping("/shipping-orders")
    public String shippingOrders(org.springframework.ui.Model model) {
        model.addAttribute("page", "shipping");
        return "shipper/shipping_orders";
    }

    @GetMapping("/completed-orders")
    public String completedOrders(org.springframework.ui.Model model) {
        model.addAttribute("page", "completed");
        return "shipper/completed_orders";
    }

    @GetMapping("/earnings")
    public String earnings(org.springframework.ui.Model model) {
        model.addAttribute("page", "earnings");
        return "shipper/earnings";
    }
}
