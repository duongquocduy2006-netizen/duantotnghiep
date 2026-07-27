package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import com.ShoeStore.model.Voucher;
import com.ShoeStore.service.OrderService;
import com.ShoeStore.service.VoucherService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderApiController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private OrderService orderService;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private vn.payos.PayOS payOS;

    // 1. LẤY DANH SÁCH ĐƠN HÀNG CỦA USER
    @GetMapping
    public ResponseEntity<?> getMyOrders(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        Long userId = ((Number) account.get("id")).longValue();
        try {
            List<Map<String, Object>> orders = orderService.getOrdersByUserId(userId);
            return ResponseEntity.ok(Map.of("success", true, "orders", orders));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy đơn hàng: " + e.getMessage()));
        }
    }

    // 2. CHI TIẾT ĐƠN HÀNG
    @GetMapping("/{orderCode}")
    public ResponseEntity<?> getOrderDetail(@PathVariable String orderCode, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        try {
            Map<String, Object> orderDetail = orderService.getOrderDetail(orderCode);
            if (orderDetail == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy đơn hàng!"));
            }

            // Kiểm tra xem đơn hàng có thuộc về user hay không (nếu không phải ADMIN)
            String role = (String) account.get("role");
            Long orderUserId = ((Number) orderDetail.get("user_id")).longValue();
            Long currentUserId = ((Number) account.get("id")).longValue();

            if (!"ADMIN".equalsIgnoreCase(role) && !orderUserId.equals(currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false, "message", "Bạn không có quyền xem đơn hàng này!"));
            }

            List<Map<String, Object>> items = orderService.getOrderItems(orderCode);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "order", orderDetail,
                    "items", items
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy chi tiết đơn hàng: " + e.getMessage()));
        }
    }

    // 3. ĐẶT HÀNG (CHECKOUT)
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody Map<String, Object> payload, HttpSession session, HttpServletRequest request) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        Long accountId = ((Number) account.get("id")).longValue();

        // Đọc thông tin từ React gửi lên
        String fullName = (String) payload.get("fullName");
        String phone = (String) payload.get("phone");
        String fullAddress = (String) payload.get("fullAddress");
        String note = (String) payload.get("note");
        String paymentMethod = (String) payload.get("paymentMethod"); // COD hoặc BANK
        String voucherCode = (String) payload.get("voucherCode");

        if (fullName == null || phone == null || fullAddress == null || paymentMethod == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng nhập đầy đủ thông tin!"));
        }

        Integer buyNowVariantId = payload.containsKey("buyNowVariantId") && payload.get("buyNowVariantId") != null ? 
                ((Number) payload.get("buyNowVariantId")).intValue() : null;
        Integer buyNowQty = payload.containsKey("buyNowQty") && payload.get("buyNowQty") != null ? 
                ((Number) payload.get("buyNowQty")).intValue() : null;

        try {
            List<Map<String, Object>> items;
            boolean isBuyNow = (buyNowVariantId != null && buyNowQty != null);

            if (isBuyNow) {
                // Lấy sản phẩm trực tiếp (Mua ngay)
                String buyNowSql = "SELECT v.id as variant_id, ? as quantity, " +
                        "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                        "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                        "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                        "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                        "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price " +
                        "FROM product_variants v WHERE v.id = ?";
                items = jdbc.queryForList(buyNowSql, buyNowQty, buyNowVariantId);
                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Sản phẩm không tồn tại!"));
                }
            } else {
                // Lấy danh sách sản phẩm từ giỏ hàng thực tế
                String cartSql = "SELECT ci.product_variant_id as variant_id, ci.quantity, " +
                        "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                        "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                        "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                        "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                        "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price " +
                        "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id " +
                        "WHERE ci.user_id = ?";
                items = jdbc.queryForList(cartSql, accountId);

                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Giỏ hàng của bạn đang trống!"));
                }
            }

            double total = items.stream()
                    .mapToDouble(item -> ((Number) item.get("price")).doubleValue() * ((Number) item.get("quantity")).intValue())
                    .sum();

            double tempShipping = 30000;
            Integer userRankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            if (userRankId != null) {
                Boolean freeShip = jdbc.queryForObject(
                        "SELECT COALESCE(free_shipping, 0) FROM membership_ranks WHERE id = ?", Boolean.class, userRankId);
                if (Boolean.TRUE.equals(freeShip)) {
                    tempShipping = 0;
                }
            }
            if (tempShipping != 0 && total >= 500000) {
                tempShipping = 0;
            }
            final double shipping = tempShipping;

            // Kiểm tra voucher
            double discount = 0;
            Voucher voucher = null;
            if (voucherCode != null && !voucherCode.trim().isEmpty()) {
                Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
                java.util.Optional<Voucher> voucherOpt = voucherService.validateVoucher(voucherCode, rankId, total, accountId);
                if (voucherOpt.isPresent()) {
                    voucher = voucherOpt.get();
                    discount = voucherService.calculateDiscount(voucher, total);
                }
            }

            double finalTotal = total + shipping - discount;

            // Xác định payment method id
            Integer pmId;
            try {
                pmId = jdbc.queryForObject(
                        "SELECT TOP 1 id FROM payment_methods WHERE method_name LIKE ? OR ? LIKE '%' + method_name + '%'",
                        Integer.class, "%" + paymentMethod + "%", paymentMethod);
            } catch (Exception e) {
                pmId = 1;
            }

            // Thêm địa chỉ mới nhận hàng
            String addressSql = "INSERT INTO addresses (receiving_name, phone_number, street_detail, is_default, user_id) VALUES (?, ?, ?, 0, ?)";
            jdbc.update(addressSql, fullName, phone, fullAddress, accountId);

            Long addressId = jdbc.queryForObject("SELECT TOP 1 id FROM addresses WHERE user_id = ? ORDER BY id DESC",
                    Long.class, accountId);

            long timestamp = System.currentTimeMillis() / 1000;
            String orderCode = "ORD-" + timestamp;

            // Thêm đơn hàng
            String orderSql = "INSERT INTO orders (order_code, user_id, total_amount, shipping_fee, final_amount, receiver_address_id, payment_method_id, status, created_at, voucher_id) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, 1, GETDATE(), ?)";

            final Integer finalPmId = pmId;
            final Voucher finalVoucher = voucher;

            org.springframework.jdbc.support.GeneratedKeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
            jdbc.update(connection -> {
                java.sql.PreparedStatement ps = connection.prepareStatement(orderSql, new String[] { "id" });
                ps.setString(1, orderCode);
                ps.setLong(2, accountId);
                ps.setDouble(3, total);
                ps.setDouble(4, shipping);
                ps.setDouble(5, finalTotal);
                ps.setLong(6, addressId);
                ps.setInt(7, finalPmId);
                if (finalVoucher != null) ps.setInt(8, finalVoucher.getId()); else ps.setNull(8, java.sql.Types.INTEGER);
                return ps;
            }, keyHolder);

            Long orderId = keyHolder.getKey().longValue();

            // Thêm order items
            for (Map<String, Object> item : items) {
                Integer variantId = ((Number) item.get("variant_id")).intValue();
                Integer buyQty = ((Number) item.get("quantity")).intValue();
                Double price = ((Number) item.get("price")).doubleValue();

                jdbc.update(
                        "INSERT INTO order_items (order_id, product_variant_id, quantity, price) VALUES (?, ?, ?, ?)",
                        orderId, variantId, buyQty, price);
            }

            // Không trừ tồn kho ở đây nữa, sẽ trừ khi chuyển sang trạng thái "Đang giao hàng"
            
            // Cập nhật Voucher
            if (voucher != null) {
                jdbc.update("UPDATE vouchers SET quantity = quantity - 1 WHERE id = ?", voucher.getId());
                jdbc.update("INSERT INTO voucher_usages (voucher_id, user_id, used_at) VALUES (?, ?, GETDATE())",
                        voucher.getId(), accountId);
            }

            // Xóa giỏ hàng nếu không phải mua ngay
            if (!isBuyNow) {
                jdbc.update("DELETE FROM cart_items WHERE user_id = ?", accountId);
            }
            // Xử lý thanh toán online qua BANK (PayOS)
            if ("BANK".equalsIgnoreCase(paymentMethod)) {
                try {
                    String scheme = request.getScheme();
                    String serverName = request.getServerName();
                    int serverPort = request.getServerPort();
                    String localBaseUrl = scheme + "://" + serverName + (serverPort == 80 || serverPort == 443 ? "" : ":" + serverPort);

                    // Quay về trang React frontend
                    String returnUrl = "http://localhost:5173/checkout-success?orderCode=" + orderCode;
                    // Gọi API để hủy đơn hàng nếu hủy PayOS
                    String cancelUrl = localBaseUrl + "/api/orders/payment-cancel?orderCode=" + orderCode;

                    long payosOrderCode = timestamp;
                    long finalAmountLong = (long) finalTotal;

                    vn.payos.model.v2.paymentRequests.PaymentLinkItem payosItem = vn.payos.model.v2.paymentRequests.PaymentLinkItem.builder()
                            .name("Thanh toan don hang " + orderCode)
                            .quantity(1)
                            .price(finalAmountLong)
                            .build();

                    vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest paymentData = vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest.builder()
                            .orderCode(payosOrderCode)
                            .amount(finalAmountLong)
                            .description("TT DH " + orderCode)
                            .item(payosItem)
                            .returnUrl(returnUrl)
                            .cancelUrl(cancelUrl)
                            .build();

                    vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse checkoutResponseData = payOS.paymentRequests().create(paymentData);
                    String checkoutUrl = checkoutResponseData.getCheckoutUrl();

                    jdbc.update("UPDATE orders SET external_transaction_id = ? WHERE order_code = ?", String.valueOf(payosOrderCode), orderCode);

                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "orderCode", orderCode,
                            "paymentMethod", "BANK",
                            "checkoutUrl", checkoutUrl
                    ));
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("success", false, "message", "Lỗi kết nối ngân hàng PayOS: " + e.getMessage()));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderCode", orderCode,
                    "paymentMethod", "COD",
                    "message", "Đặt hàng thành công!"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Đặt hàng không thành công: " + e.getMessage()));
        }
    }

    // 4. HỦY ĐƠN HÀNG (KHI CHỜ DUYỆT)
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelOrder(@RequestBody Map<String, Object> payload, HttpSession session) {
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
        Long userId = ((Number) account.get("id")).longValue();

        try {
            orderService.cancelOrder(orderCode, userId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Hủy đơn hàng thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Không thể hủy đơn hàng: " + e.getMessage()));
        }
    }

    // 5. XÁC NHẬN ĐÃ NHẬN HÀNG
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmOrder(@RequestBody Map<String, Object> payload, HttpSession session) {
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
        Long userId = ((Number) account.get("id")).longValue();

        try {
            orderService.confirmOrder(orderCode, userId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xác nhận nhận hàng thành công và cộng điểm tích lũy!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Không thể xác nhận đơn hàng: " + e.getMessage()));
        }
    }

    // 6. XỬ LÝ KHI KHÁCH HÀNG HỦY THANH TOÁN PAYOS (ĐƯỜNG DẪN CALLBACK TỪ PAYOS)
    @GetMapping("/payment-cancel")
    public RedirectView handlePaymentCancel(@RequestParam("orderCode") String orderCode) {
        try {
            // Tìm thông tin đơn hàng
            List<Map<String, Object>> orders = jdbc.queryForList(
                    "SELECT id, user_id, voucher_id, order_code FROM orders WHERE order_code = ? OR external_transaction_id = ?",
                    orderCode, orderCode
            );

            if (!orders.isEmpty()) {
                Map<String, Object> order = orders.get(0);
                Long orderId = ((Number) order.get("id")).longValue();
                Long userId = ((Number) order.get("user_id")).longValue();
                Integer vId = (Integer) order.get("voucher_id");
                String actualOrderCode = (String) order.get("order_code");

                // Không cần khôi phục tồn kho vì chưa bị trừ lúc đặt hàng

                // Khôi phục lại giỏ hàng
                List<Map<String, Object>> items = jdbc.queryForList("SELECT product_variant_id, quantity FROM order_items WHERE order_id = ?", orderId);
                for (Map<String, Object> item : items) {
                    int count = jdbc.queryForObject("SELECT COUNT(*) FROM cart_items WHERE user_id = ? AND product_variant_id = ?", Integer.class, userId, item.get("product_variant_id"));
                    if (count > 0) {
                        jdbc.update("UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_variant_id = ?",
                                item.get("quantity"), userId, item.get("product_variant_id"));
                    } else {
                        jdbc.update("INSERT INTO cart_items (user_id, product_variant_id, quantity) VALUES (?, ?, ?)",
                                userId, item.get("product_variant_id"), item.get("quantity"));
                    }
                }

                // Khôi phục Voucher
                if (vId != null) {
                    jdbc.update("UPDATE vouchers SET quantity = quantity + 1 WHERE id = ?", vId);
                    jdbc.update("DELETE FROM voucher_usages WHERE id = (SELECT TOP 1 id FROM voucher_usages WHERE voucher_id = ? AND user_id = ? ORDER BY used_at DESC)", vId, userId);
                }

                // Xóa sạch đơn hàng nháp do thanh toán không thành công
                jdbc.update("DELETE FROM order_items WHERE order_id = ?", orderId);
                jdbc.update("DELETE FROM orders WHERE id = ?", orderId);
            }

            // Chuyển hướng trình duyệt về lại trang giỏ hàng của React kèm thông báo lỗi
            return new RedirectView("http://localhost:5173/cart?error=payment_cancelled");
        } catch (Exception e) {
            e.printStackTrace();
            return new RedirectView("http://localhost:5173/cart?error=system_error");
        }
    }

    // 7. LẤY TOÀN BỘ ĐƠN HÀNG DÀNH CHO ADMIN
    @GetMapping("/all")
    public ResponseEntity<?> getAllOrdersAdmin(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) Integer status) {
        try {
            List<com.ShoeStore.model.OrderDTO> orders = orderService.getAllOrders(keyword, status);
            return ResponseEntity.ok(Map.of("success", true, "orders", orders));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy toàn bộ đơn hàng: " + e.getMessage()));
        }
    }

    // 8. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG DÀNH CHO ADMIN
    @PostMapping("/update-status")
    public ResponseEntity<?> updateOrderStatusAdmin(@RequestBody Map<String, Object> payload) {
        String orderCode = (String) payload.get("orderCode");
        Integer status = (Integer) payload.get("status");

        if (orderCode == null || status == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode hoặc status!"));
        }

        try {
            if (status == 3) {
                int currentStatus = orderService.getOrderStatus(orderCode);
                // Admin chỉ có thể duyệt thành công nếu đơn hàng ở trạng thái Chờ duyệt (5)
                if (currentStatus != 5) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", 
                            "Admin chỉ có thể xác nhận 'Thành công' sau khi khách hàng đã nhấn 'Đã nhận hàng' (Trạng thái: Đã nhận hàng)."));
                }
            }

            orderService.updateOrderStatus(orderCode, status);
            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật trạng thái đơn hàng thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật trạng thái đơn hàng: " + e.getMessage()));
        }
    }
}
