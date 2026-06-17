package com.ShoeStore.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/chat")
public class AdminChatController {

    @GetMapping
    public String showChatPage() {
        return "admin/admin-chat";
    }
}
