package com.ShoeStore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = {"com.ShoeStore"})
@EnableScheduling
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

            try {
                jdbcTemplate.execute("ALTER TABLE product_reviews ADD is_hidden BIT DEFAULT 0");
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

            // 5. Sửa lỗi bảng Orders (thêm cột cancel_reason, voucher_id, external_transaction_id nếu thiếu)
            try {
                jdbcTemplate.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'cancel_reason') ALTER TABLE orders ADD cancel_reason NVARCHAR(500) NULL;");
                jdbcTemplate.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'external_transaction_id') ALTER TABLE orders ADD external_transaction_id NVARCHAR(255) NULL;");
                jdbcTemplate.execute("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'voucher_id') ALTER TABLE orders ADD voucher_id INT NULL;");
                System.out.println("-> Fix: orders table columns checked/added");
            } catch (Exception e) {}

            // 5b. Xóa CHECK constraint trên flash_sale_products.quantity_limit cho phép quantity_limit = 0 (Không giới hạn)
            try {
                String dropConstraintSql = 
                    "DECLARE @sql NVARCHAR(MAX) = ''; " +
                    "SELECT @sql += 'ALTER TABLE dbo.flash_sale_products DROP CONSTRAINT ' + QUOTENAME(name) + ';' " +
                    "FROM sys.check_constraints " +
                    "WHERE parent_object_id = OBJECT_ID('dbo.flash_sale_products') AND definition LIKE '%quantity_limit%'; " +
                    "EXEC sp_executesql @sql;";
                jdbcTemplate.execute(dropConstraintSql);
                jdbcTemplate.execute("ALTER TABLE dbo.flash_sale_products ALTER COLUMN quantity_limit INT NULL;");
                System.out.println("-> Fix: Dropped CHECK constraint on flash_sale_products.quantity_limit");
            } catch (Exception e) {
                System.out.println("-> Notice dropping CHECK constraint: " + e.getMessage());
            }

            // 6. Tạo và khởi tạo dữ liệu mẫu cho bảng Lookbooks
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

            // 6. Thêm cột updated_at cho bảng orders (theo dõi thời gian chuyển trạng thái)
            try {
                jdbcTemplate.execute("ALTER TABLE orders ADD updated_at DATETIME DEFAULT GETDATE()");
                System.out.println("-> Fix: orders.updated_at DATETIME added");
            } catch (Exception e) {
                // Cột đã tồn tại, bỏ qua
            }
            
            System.out.println("=== TẤT CẢ DB FIX ĐÃ HOÀN TẤT ===");
        };
    }
}