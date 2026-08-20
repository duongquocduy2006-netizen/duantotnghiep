package com.ShoeStore.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Filter kiểm tra xem tài khoản đang đăng nhập có bị khóa không.
 * Nếu bị khóa → xóa session và trả về 401/redirect về login.
 */
@Component
public class AccountStatusFilter extends OncePerRequestFilter {

    @Autowired
    private JdbcTemplate jdbc;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);

        if (session != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

            if (account != null) {
                Object emailObj = account.get("email");
                if (emailObj != null) {
                    try {
                        String sql = "SELECT status FROM accounts WHERE email = ?";
                        Integer status = jdbc.queryForObject(sql, Integer.class, emailObj.toString());

                        if (status != null && status == 0) {
                            // Tài khoản bị khóa → hủy session và trả về lỗi
                            session.invalidate();
                            SecurityContextHolder.clearContext();

                            String requestURI = request.getRequestURI();
                            String accept = request.getHeader("Accept");

                            if (requestURI.startsWith("/api/") ||
                                (accept != null && accept.contains("application/json"))) {
                                // API request → trả về JSON 401
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.setContentType("application/json");
                                response.setCharacterEncoding("UTF-8");
                                response.getWriter().write(
                                    "{\"success\":false,\"message\":\"Tài khoản của bạn đã bị khóa!\",\"locked\":true}"
                                );
                                return;
                            } else {
                                // Web request → redirect về login
                                response.sendRedirect("/login?error=account_locked");
                                return;
                            }
                        }
                    } catch (Exception ignored) {
                        // Không block request nếu lỗi DB
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Không lọc các URL public
        return path.equals("/login")
            || path.equals("/register")
            || path.startsWith("/oauth2/")
            || path.startsWith("/css/")
            || path.startsWith("/js/")
            || path.startsWith("/images/")
            || path.startsWith("/assets/")
            || path.equals("/api/auth/login")
            || path.equals("/api/auth/register")
            || path.equals("/api/auth/google-login-mobile");
    }
}
