package com.ShoeStore.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class ShipperAuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        HttpSession session = request.getSession(false);

        // 1. Kiểm tra session và attribute account
        if (session != null && session.getAttribute("account") != null) {
            Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
            String role = (String) account.get("role");

            // 2. Chấp nhận tài khoản có role là SHIPPER (hoặc ADMIN được quyền vào kiểm tra)
            if ("SHIPPER".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
                return true;
            }
        }

        // Nếu chưa đăng nhập HOẶC không phải SHIPPER/ADMIN -> Chuyển hướng về trang Đăng nhập
        response.sendRedirect(request.getContextPath() + "/login");
        return false;
    }
}
