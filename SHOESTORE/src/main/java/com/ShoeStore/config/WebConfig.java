package com.ShoeStore.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /*
     * @Autowired
     * private AdminAuthInterceptor adminAuthInterceptor;
     * 
     * @Autowired
     * private ShipperAuthInterceptor shipperAuthInterceptor;
     */

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Vô hiệu hóa các Interceptor phân quyền cũ vì hiện đã có Spring Security xử lý
        /*
         * registry.addInterceptor(adminAuthInterceptor)
         * .addPathPatterns("/admin/**");
         * 
         * registry.addInterceptor(shipperAuthInterceptor)
         * .addPathPatterns("/shipper/**");
         */
    }

    @Override
    public void addResourceHandlers(
            org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        // Cấu hình phục vụ file tĩnh từ thư mục uploads ngoài project
        registry.addResourceHandler("/images/**", "/uploads/**")
                .addResourceLocations("file:uploads/", "classpath:/static/images/");
    }

    // Bean dùng cho API GHN
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

}