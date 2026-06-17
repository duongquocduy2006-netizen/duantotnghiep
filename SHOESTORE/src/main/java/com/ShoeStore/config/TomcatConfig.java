package com.ShoeStore.config;

import java.lang.reflect.Method;

import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> factory.addContextCustomizers(context -> {
            try {
                // Dùng Reflection để ép Tomcat gọi hàm setMaxFileCount
                // Cách này bypass hoàn toàn lỗi gạch đỏ của phần mềm IDE
                Method method = context.getClass().getMethod("setMaxFileCount", int.class);

                // Truyền -1 để vô hiệu hóa giới hạn chống DoS của Tomcat 11
                method.invoke(context, -1);
                System.out.println(" ĐÃ MỞ KHÓA GIỚI HẠN UPLOAD CỦA TOMCAT THÀNH CÔNG!");
            } catch (Exception e) {
                System.out.println(" Bỏ qua cảnh báo Tomcat: " + e.getMessage());
            }
        });
    }
}