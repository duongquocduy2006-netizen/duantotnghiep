package com.ShoeStore.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import java.util.Map;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private JdbcTemplate jdbc;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        try {
            String sql = "SELECT id, email, password, role, full_name, status FROM accounts WHERE LOWER(email) = LOWER(?)";
            Map<String, Object> account = jdbc.queryForMap(sql, email);

            Integer status = (Integer) account.get("status");
            boolean isLocked = (status != null && status == 0);

            String role = (String) account.get("role");
            
            return User.builder()
                .username((String) account.get("email"))
                .password((String) account.get("password"))
                .authorities("ROLE_" + role.toUpperCase()) 
                .accountLocked(isLocked)
                .build();
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            throw new UsernameNotFoundException("Không tìm thấy người dùng với email: " + email);
        } catch (Exception e) {
            throw new UsernameNotFoundException("Lỗi khi tải thông tin người dùng", e);
        }
    }
}
