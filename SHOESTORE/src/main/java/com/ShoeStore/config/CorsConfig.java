package com.ShoeStore.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Áp dụng cho toàn bộ các endpoint (API) trong hệ thống
                .allowedOrigins(
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://localhost:8080",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:3000"
                )
                .allowedOriginPatterns(
                    "http://localhost:*",
                    "http://127.0.0.1:*"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH") // Cho phép các phương thức HTTP
                .allowedHeaders("*") // Cho phép tất cả các Headers trong request
                .allowCredentials(true) // Cho phép gửi kèm Credentials (Cookies, Session ID, Auth Headers)
                .maxAge(3600); // Cache phản hồi Preflight trong 1 giờ để giảm tải request OPTIONS
    }
}

