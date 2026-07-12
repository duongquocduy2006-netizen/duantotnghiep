package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartApiController {

    @Autowired
    private JdbcTemplate jdbc;

    // 1. LẤY DANH SÁCH GIỎ HÀNG
    @GetMapping
    public ResponseEntity<?> getCart(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        Long accountId = ((Number) account.get("id")).longValue();

        String sql = "SELECT ci.id, ci.quantity, ci.product_variant_id as variant_id, p.id as product_id, " +
                "p.product_name, s.size_name, col.color_name, v.price as original_price, v.quantity as stock, " +
                "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                "       JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                "       WHERE fsp.product_id = p.id AND fs.status = 1 " +
                "       AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                "       AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price, " +
                "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url " +
                "FROM cart_items ci " +
                "JOIN product_variants v ON ci.product_variant_id = v.id " +
                "JOIN products p ON v.product_id = p.id " +
                "JOIN sizes s ON v.size_id = s.id " +
                "JOIN colors col ON v.color_id = col.id " +
                "WHERE ci.user_id = ?";

        List<Map<String, Object>> cartItems = jdbc.queryForList(sql, accountId);

        double total = cartItems.stream()
                .mapToDouble(item -> ((Number) item.get("price")).doubleValue() * ((Number) item.get("quantity")).intValue())
                .sum();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("cartItems", cartItems);
        response.put("totalPrice", total);

        return ResponseEntity.ok(response);
    }

    // 2. THÊM SẢN PHẨM VÀO GIỎ HÀNG
    @PostMapping("/add")
    public ResponseEntity<?> addToCart(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        if (!payload.containsKey("variantId") || !payload.containsKey("quantity")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu variantId hoặc quantity!"));
        }

        Integer variantId = ((Number) payload.get("variantId")).intValue();
        Integer quantity = ((Number) payload.get("quantity")).intValue();

        Long accountId = ((Number) account.get("id")).longValue();

        try {
            String stockSql = "SELECT quantity FROM product_variants WHERE id = ?";
            int availableStock = jdbc.queryForObject(stockSql, Integer.class, variantId);

            String checkSql = "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_variant_id = ?";
            List<Map<String, Object>> existing = jdbc.queryForList(checkSql, accountId, variantId);

            int currentInCart = 0;
            if (!existing.isEmpty()) {
                currentInCart = ((Number) existing.get(0).get("quantity")).intValue();
            }

            if (currentInCart + quantity > availableStock) {
                String errorMsg = "";
                if (currentInCart > 0) {
                    errorMsg = "Trong giỏ đã có " + currentInCart + " sản phẩm này. Kho chỉ còn " + availableStock + ", không thể thêm vượt quá tồn kho!";
                } else {
                    errorMsg = "Xin lỗi, kho chỉ còn " + availableStock + " sản phẩm.";
                }
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", errorMsg
                ));
            }

            if (quantity > 0) {
                if (!existing.isEmpty()) {
                    // Update quantity
                    int newQty = currentInCart + quantity;
                    jdbc.update("UPDATE cart_items SET quantity = ? WHERE id = ?", newQty, existing.get(0).get("id"));
                } else {
                    // Insert new
                    jdbc.update("INSERT INTO cart_items (user_id, product_variant_id, quantity) VALUES (?, ?, ?)",
                            accountId, variantId, quantity);
                }
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Đã thêm vào giỏ hàng!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi thêm giỏ hàng: " + e.getMessage()));
        }
    }

    // 3. CẬP NHẬT SỐ LƯỢNG GIỎ HÀNG
    @PostMapping("/update")
    public ResponseEntity<?> updateCart(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        if (!payload.containsKey("itemId") || !payload.containsKey("quantity")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu itemId hoặc quantity!"));
        }

        Integer itemId = ((Number) payload.get("itemId")).intValue();
        Integer quantity = ((Number) payload.get("quantity")).intValue();

        try {
            if (quantity <= 0) {
                jdbc.update("DELETE FROM cart_items WHERE id = ?", itemId);
            } else {
                // Kiểm tra tồn kho trước khi update
                String stockSql = "SELECT v.quantity FROM product_variants v " +
                        "JOIN cart_items ci ON v.id = ci.product_variant_id " +
                        "WHERE ci.id = ?";
                int availableStock = jdbc.queryForObject(stockSql, Integer.class, itemId);

                if (quantity > availableStock) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Chỉ còn " + availableStock + " sản phẩm trong kho!"
                    ));
                }

                jdbc.update("UPDATE cart_items SET quantity = ? WHERE id = ?", quantity, itemId);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Đã cập nhật số lượng!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật giỏ hàng: " + e.getMessage()));
        }
    }

    // 4. XÓA MỘT SẢN PHẨM KHỎI GIỎ HÀNG
    @PostMapping("/remove")
    public ResponseEntity<?> removeFromCart(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        if (!payload.containsKey("itemId")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu itemId!"));
        }

        Integer itemId = ((Number) payload.get("itemId")).intValue();

        try {
            jdbc.update("DELETE FROM cart_items WHERE id = ?", itemId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa sản phẩm khỏi giỏ hàng!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xóa sản phẩm: " + e.getMessage()));
        }
    }

    // 5. MUA LẠI ĐƠN HÀNG (RE-BUY)
    @PostMapping("/re-buy")
    public ResponseEntity<?> reBuy(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        if (!payload.containsKey("orderCode")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode!"));
        }

        String orderCode = (String) payload.get("orderCode");
        Long accountId = ((Number) account.get("id")).longValue();

        try {
            // 1. Xác thực đơn hàng có thuộc về user hay không
            String verifySql = "SELECT id FROM orders WHERE order_code = ? AND user_id = ?";
            List<Map<String, Object>> orders = jdbc.queryForList(verifySql, orderCode, accountId);
            if (orders.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Đơn hàng không hợp lệ."));
            }

            Long orderId = ((Number) orders.get(0).get("id")).longValue();

            // 2. Lấy danh sách sản phẩm từ order_items
            String itemsSql = "SELECT product_variant_id, quantity FROM order_items WHERE order_id = ?";
            List<Map<String, Object>> items = jdbc.queryForList(itemsSql, orderId);

            int addedCount = 0;
            for (Map<String, Object> item : items) {
                Integer variantId = ((Number) item.get("product_variant_id")).intValue();
                Integer quantity = ((Number) item.get("quantity")).intValue();

                // 3. Kiểm tra tồn kho
                String stockSql = "SELECT quantity FROM product_variants WHERE id = ?";
                Integer stock = jdbc.queryForObject(stockSql, Integer.class, variantId);

                if (stock != null && stock > 0) {
                    int qtyToAdd = Math.min(quantity, stock);

                    String checkSql = "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_variant_id = ?";
                    List<Map<String, Object>> existing = jdbc.queryForList(checkSql, accountId, variantId);

                    if (!existing.isEmpty()) {
                        int currentInCart = ((Number) existing.get(0).get("quantity")).intValue();
                        int newQty = Math.min(currentInCart + qtyToAdd, stock);
                        jdbc.update("UPDATE cart_items SET quantity = ? WHERE id = ?", newQty, existing.get(0).get("id"));
                    } else {
                        jdbc.update("INSERT INTO cart_items (user_id, product_variant_id, quantity) VALUES (?, ?, ?)",
                                accountId, variantId, qtyToAdd);
                    }
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Đã thêm các sản phẩm vào giỏ hàng thành công!"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Sản phẩm trong đơn hàng hiện đã hết hàng!"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi mua lại đơn hàng: " + e.getMessage()));
        }
    }
    // 6. MUA NGAY (Tạo giỏ hàng ảo)
    @GetMapping("/buy-now")
    public ResponseEntity<?> getBuyNowCart(@RequestParam("variantId") Integer variantId, 
                                           @RequestParam("qty") Integer quantity, 
                                           HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");

        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        try {
            // Lấy thông tin biến thể sản phẩm
            String sql = "SELECT -1 as id, v.id as variant_id, p.id as product_id, " +
                    "p.product_name, s.size_name, col.color_name, v.price as original_price, v.quantity as stock, " +
                    "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                    "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price, " +
                    "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url " +
                    "FROM product_variants v " +
                    "JOIN products p ON v.product_id = p.id " +
                    "JOIN sizes s ON v.size_id = s.id " +
                    "JOIN colors col ON v.color_id = col.id " +
                    "WHERE v.id = ?";
                    
            List<Map<String, Object>> variants = jdbc.queryForList(sql, variantId);
            if (variants.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Sản phẩm không tồn tại!"));
            }
            
            Map<String, Object> item = new java.util.HashMap<>(variants.get(0));
            int stock = ((Number) item.get("stock")).intValue();
            
            int finalQty = quantity;
            if (finalQty > stock) finalQty = stock;
            if (finalQty <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Sản phẩm đã hết hàng!"));
            }
            
            item.put("quantity", finalQty);
            item.put("id", -1); // Fake cart item id
            
            double price = ((Number) item.get("price")).doubleValue();
            double totalPrice = price * finalQty;
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "cartItems", List.of(item),
                    "totalPrice", totalPrice
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tạo giỏ hàng ảo: " + e.getMessage()));
        }
    }
}
