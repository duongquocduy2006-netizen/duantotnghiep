package com.ShoeStore.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        HttpSession session = request.getSession(false);

        // 1. Kiểm tra session và attribute account
        if (session != null && session.getAttribute("account") != null) {
            Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
            String role = (String) account.get("role");

            // 2. Kiểm tra role có phải là ADMIN không (bỏ qua phân biệt hoa thường)
            if ("ADMIN".equalsIgnoreCase(role)) {
                return true; // Cho phép đi tiếp vào Controller Admin
            }
        }

        // Nếu chưa đăng nhập HOẶC không phải ADMIN -> Chuyển hướng về trang Đăng nhập
        response.sendRedirect(request.getContextPath() + "/login");
        return false; // Ngăn chặn truy cập vào Controller Admin
    }
}
