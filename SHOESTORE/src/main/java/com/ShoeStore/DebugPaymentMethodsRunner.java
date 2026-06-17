package com.ShoeStore;


import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class DebugPaymentMethodsRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    public DebugPaymentMethodsRunner(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- DEBUG: PAYMENT METHODS ---");
        try {
            List<Map<String, Object>> methods = jdbc.queryForList("SELECT * FROM payment_methods");
            boolean hasCod = false;
            boolean hasBank = false;
            for (Map<String, Object> m : methods) {
                String name = (String) m.get("method_name");
                if ("COD".equalsIgnoreCase(name))
                    hasCod = true;
                if ("BANK".equalsIgnoreCase(name) || "Chuyển khoản".equalsIgnoreCase(name))
                    hasBank = true;
            }
            if (!hasCod) {
                System.out.println("Seeding COD...");
                jdbc.execute("INSERT INTO payment_methods (method_name) VALUES ('COD')");
            }
            if (!hasBank) {
                System.out.println("Seeding BANK...");
                jdbc.execute("INSERT INTO payment_methods (method_name) VALUES ('BANK')");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
