package com.ShoeStore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@ComponentScan(basePackages = {"com.ShoeStore"})
public class ShoeStoreJava5AsmApplication {

    public static void main(String[] args) {
        System.setProperty("org.apache.tomcat.util.http.fileupload.MAX_FILE_COUNT", "-1");
        SpringApplication.run(ShoeStoreJava5AsmApplication.class, args);
    }

    @Bean
    public CommandLineRunner fixDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            // 1. Sửa lỗi bảng Accounts
            try {
                jdbcTemplate.execute("ALTER TABLE accounts ALTER COLUMN full_name NVARCHAR(255)");
                System.out.println("-> Fix: full_name NVARCHAR(255)");
            } catch (Exception e) {}

            // 2. Sửa lỗi bảng Đánh giá
            try {
                jdbcTemplate.execute("ALTER TABLE product_reviews ADD parent_id INT NULL");
            } catch (Exception e) {}
            
            try {
                jdbcTemplate.execute("ALTER TABLE product_reviews ADD like_count INT DEFAULT 0");
            } catch (Exception e) {}

            // 3. Tạo bảng lưu trữ Like
            try {
                jdbcTemplate.execute("CREATE TABLE product_review_likes (" +
                                     "id INT IDENTITY(1,1) PRIMARY KEY, " +
                                     "review_id INT NOT NULL, " +
                                     "user_id INT NOT NULL, " +
                                     "created_at DATETIME DEFAULT GETDATE())");
            } catch (Exception e) {}

            // 4. Sửa lỗi font Tiếng Việt cho Flash Sale
            try {
                jdbcTemplate.execute("ALTER TABLE flash_sales ALTER COLUMN name NVARCHAR(255)");
                System.out.println("-> Fix: flash_sales.name NVARCHAR(255)");
            } catch (Exception e) {}

            // 5. Tạo và khởi tạo dữ liệu mẫu cho bảng Lookbooks
            try {
                jdbcTemplate.execute("IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lookbooks' AND xtype='U') " +
                        "CREATE TABLE lookbooks (" +
                        "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                        "caption NVARCHAR(255) NULL, " +
                        "image_url NVARCHAR(255) NULL, " +
                        "status BIT DEFAULT 1, " +
                        "created_at DATETIME DEFAULT GETDATE(), " +
                        "updated_at DATETIME DEFAULT GETDATE())");
                
                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lookbooks", Integer.class);
                if (count != null && count == 0) {
                    jdbcTemplate.execute("INSERT INTO lookbooks (caption, image_url, status, created_at, updated_at) VALUES " +
                            "('#shoesstore_jordan', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600', 1, GETDATE(), GETDATE()), " +
                            "('#shoesstore_style', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600', 1, GETDATE(), GETDATE()), " +
                            "('#shoesstore_fit', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=600', 1, GETDATE(), GETDATE()), " +
                            "('#shoesstore_active', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=600', 1, GETDATE(), GETDATE())");
                    System.out.println("-> Seeded lookbooks default data");
                }
            } catch (Exception e) {
                System.out.println("-> Error seeding lookbooks: " + e.getMessage());
            }
            
            System.out.println("=== TẤT CẢ DB FIX ĐÃ HOÀN TẤT ===");
        };
    }
}