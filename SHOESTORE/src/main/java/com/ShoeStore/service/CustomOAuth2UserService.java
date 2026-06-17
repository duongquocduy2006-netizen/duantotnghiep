package com.ShoeStore.service;

import java.util.Map;
import java.util.Collections;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EmailService emailService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception e) {
            String email = oAuth2User.getAttribute("email");
            if (e.getMessage() != null && e.getMessage().contains("khóa") && email != null) {
                emailService.sendAccountLockedEmail(email);
            }
            throw new org.springframework.security.oauth2.core.OAuth2AuthenticationException(
                new org.springframework.security.oauth2.core.OAuth2Error("account_locked"), e.getMessage());
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String fullName = oAuth2User.getAttribute("name");
        
        // 1. Kiểm tra User đã tồn tại trong DB chưa
        String sql = "SELECT * FROM accounts WHERE email = ?";
        try {
            Map<String, Object> account = jdbc.queryForMap(sql, email);
            // Đã tồn tại -> Trả về User với Role từ DB
            Integer status = (Integer) account.get("status");
            if (status != null && status == 0) {
                throw new RuntimeException("Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin.");
            }

            String role = (String) account.get("role");
            return new DefaultOAuth2User(
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())),
                oAuth2User.getAttributes(),
                "email"
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            // Chưa tồn tại -> Tạo mới người dùng
            String userCode = "G" + (System.currentTimeMillis() % 100000);
            String insertSql = "INSERT INTO accounts (user_code, email, full_name, role, status, membership_rank_id, password) " +
                               "VALUES (?, ?, ?, 'USER', 1, 1, '')";
            jdbc.update(insertSql, userCode, email, fullName);
            
            return new DefaultOAuth2User(
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")),
                oAuth2User.getAttributes(),
                "email"
            );
        }
    }
}
