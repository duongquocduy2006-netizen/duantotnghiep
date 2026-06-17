package com.ShoeStore.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Component
public class CustomSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private JdbcTemplate jdbc;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        String email = "";
        String fullName = "";

        // Kiểm tra xem là đăng nhập bằng Form hay OAuth2
        if (authentication.getPrincipal() instanceof DefaultOAuth2User) {
            DefaultOAuth2User oauthUser = (DefaultOAuth2User) authentication.getPrincipal();
            email = oauthUser.getAttribute("email");
            fullName = oauthUser.getAttribute("name");

            // Xử lý logic đồng bộ tài khoản Google vào DB
            syncOAuthAccount(email, fullName, request.getSession());
        } else {
            // Đăng nhập bằng Form (sẽ xử lý sau khi lấy được Principal)
            email = authentication.getName();
            
            // Lấy thông tin tài khoản từ DB để lưu vào Session
            Map<String, Object> account = jdbc.queryForMap("SELECT * FROM accounts WHERE email = ?", email);
            request.getSession().setAttribute("account", account);
        }

        // Chuyển hướng dựa trên vai trò
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) request.getSession().getAttribute("account");
        String role = (String) account.get("role");

        if ("ADMIN".equalsIgnoreCase(role)) {
            response.sendRedirect(request.getContextPath() + "/admin/dashboard");
        } else if ("SHIPPER".equalsIgnoreCase(role)) {
            response.sendRedirect(request.getContextPath() + "/shipper/dashboard");
        } else {
            response.sendRedirect(request.getContextPath() + "/");
        }
    }

    private void syncOAuthAccount(String email, String fullName, HttpSession session) {
        try {
            // Kiểm tra xem email đã tồn tại chưa
            Map<String, Object> account = null;
            try {
                account = jdbc.queryForMap("SELECT * FROM accounts WHERE email = ?", email);
            } catch (Exception e) {
                // Email chưa tồn tại -> Tạo mới
                String userCode = "G" + (System.currentTimeMillis() % 10000);
                String password = UUID.randomUUID().toString(); // Random password for OAuth users
                
                String insertSql = "INSERT INTO accounts (user_code, email, password, full_name, role, status, membership_rank_id) "
                        + "VALUES (?, ?, ?, ?, 'USER', 1, 1)";
                jdbc.update(insertSql, userCode, email, password, fullName);
                
                account = jdbc.queryForMap("SELECT * FROM accounts WHERE email = ?", email);
            }
            // Lưu thông tin vào Session
            session.setAttribute("account", account);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
