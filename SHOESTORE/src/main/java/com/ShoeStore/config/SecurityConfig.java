package com.ShoeStore.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import com.ShoeStore.service.CustomOAuth2UserService;
import com.ShoeStore.service.EmailService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import java.util.Collections;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Autowired
    private ClientRegistrationRepository clientRegistrationRepository;

    private OAuth2AuthorizationRequestResolver authorizationRequestResolver() {
        DefaultOAuth2AuthorizationRequestResolver resolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, "/oauth2/authorization");

        resolver.setAuthorizationRequestCustomizer(
                customizer -> customizer.additionalParameters(params -> params.put("prompt", "select_account")));
        return resolver;
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOrigins(java.util.List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5175"
        ));
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception -> exception
                        .defaultAuthenticationEntryPointFor(
                                (request, response, authException) -> {
                                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                                    response.setContentType("application/json");
                                    response.setCharacterEncoding("UTF-8");
                                    response.getWriter().write("{\"success\":false,\"message\":\"Unauthenticated\"}");
                                },
                                org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher.pathPattern("/api/**")
                        )
                )
                .authorizeHttpRequests((requests) -> requests
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/", "/login", "/register", "/forgot-password", "/verify-otp", "/resend-otp",
                                "/reset-password", "/shop", "/details", "/new-arrivals", "/flash-sale", "/product/**",
                                "/cart/**", "/api/**", "/api/auth/**", "/assets/**", "/css/**", "/js/**", "/images/**", "/uploads/**", "/error")
                        .permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers("/shipper/**").hasRole("SHIPPER")
                        .anyRequest().authenticated())
                .formLogin((form) -> form
                        .loginPage("/login")
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .successHandler(authenticationSuccessHandler())
                        .failureHandler(authenticationFailureHandler())
                        .permitAll())
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .authorizationEndpoint(authorization -> authorization
                                .authorizationRequestResolver(authorizationRequestResolver()))
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService))
                        .successHandler(authenticationSuccessHandler())
                        .failureHandler(authenticationFailureHandler()))
                .logout((logout) -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll());

        return http.build();
    }

    @Autowired
    private EmailService emailService;

    @Bean
    public AuthenticationFailureHandler authenticationFailureHandler() {
        return (request, response, exception) -> {
            String errorMessage = "error";
            String msg = exception.getMessage();

            // Log lỗi để debug nếu cần
            System.out.println("Login Failure: " + exception.getClass().getName() + " - " + msg);

            if (exception instanceof org.springframework.security.authentication.LockedException ||
                    (msg != null && msg.toLowerCase().contains("khóa")) ||
                    (exception instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException o2e &&
                            "account_locked".equals(o2e.getError().getErrorCode()))
                    ||
                    (exception.getCause() != null && exception.getCause().getMessage() != null
                            && exception.getCause().getMessage().toLowerCase().contains("khóa"))) {

                errorMessage = "account_locked";

                // Gửi mail thông báo
                String email = request.getParameter("email");
                if (email != null && !email.trim().isEmpty()) {
                    emailService.sendAccountLockedEmail(email);
                }
            }
            String accept = request.getHeader("Accept");
            if ((accept != null && accept.contains("application/json"))
                    || "XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
                response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"success\":false, \"message\":\"" + errorMessage + "\"}");
                return;
            }

            response.sendRedirect("/login?error=" + errorMessage);
        };
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return (request, response, authentication) -> {
            String email;
            if (authentication instanceof OAuth2AuthenticationToken oauth2Token) {
                email = oauth2Token.getPrincipal().getAttribute("email");
            } else {
                email = authentication.getName();
            }

            String sql = "SELECT id, password, role, full_name, status, email, phone, points, membership_rank_id FROM accounts WHERE email = ?";
            Map<String, Object> account;
            try {
                account = jdbc.queryForMap(sql, email);
            } catch (Exception e) {
                // Trường hợp hy hữu không tìm thấy account sau khi OAuth2
                response.sendRedirect("/login?error=account_not_found");
                return;
            }

            Integer status = (Integer) account.get("status");
            if (status != null && status == 0) {
                request.getSession().invalidate();
                if (authentication instanceof OAuth2AuthenticationToken) {
                    response.sendRedirect("http://localhost:5173/login?error=account_locked");
                } else {
                    response.sendRedirect("/login?error=account_locked");
                }
                return;
            }

            HttpSession session = request.getSession();
            session.setAttribute("account", account);

            String role = (String) account.get("role");

            // Xử lý AJAX/JSON request
            String acceptHeader = request.getHeader("Accept");
            if ((acceptHeader != null && acceptHeader.contains("application/json"))
                    || "XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                String accountJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(account);
                response.getWriter().write(
                        "{\"success\":true, \"message\":\"Login successful\", \"account\": " + accountJson + "}");
                return;
            }

            // Nếu là OAuth2 Login từ Google, chuyển hướng về Frontend React
            if (authentication instanceof OAuth2AuthenticationToken) {
                response.sendRedirect("http://localhost:5173/oauth2/redirect");
                return;
            }

            // Chuyển hướng mặc định cho Form Login (Server-side)
            if ("ADMIN".equalsIgnoreCase(role)) {
                response.sendRedirect("/admin/dashboard");
            } else if ("SHIPPER".equalsIgnoreCase(role)) {
                response.sendRedirect("/shipper/dashboard");
            } else {
                response.sendRedirect("/");
            }
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return NoOpPasswordEncoder.getInstance();
    }
}