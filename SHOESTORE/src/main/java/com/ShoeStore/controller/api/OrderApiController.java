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
            for (Map<String, Object> order : orders) {
                String orderCode = (String) order.get("order_code");
                List<Map<String, Object>> items = orderService.getOrderItems(orderCode);
                order.put("items", items);
            }
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
        Double shippingFee = payload.containsKey("shippingFee") && payload.get("shippingFee") != null ? 
                ((Number) payload.get("shippingFee")).doubleValue() : null;

        if (fullName == null || phone == null || fullAddress == null || paymentMethod == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng nhập đầy đủ thông tin!"));
        }

        Integer buyNowVariantId = payload.containsKey("buyNowVariantId") && payload.get("buyNowVariantId") != null ? 
                ((Number) payload.get("buyNowVariantId")).intValue() : null;
        Integer buyNowQty = payload.containsKey("buyNowQty") && payload.get("buyNowQty") != null ? 
                ((Number) payload.get("buyNowQty")).intValue() : null;

        try {
            String fsJoinSubquery = "LEFT JOIN ( " +
                    "    SELECT fsp.product_id, fsp.variant_id, fsp.id as fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                    "    FROM flash_sale_products fsp " +
                    "    JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "    WHERE fs.status = 1 AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    ") fsp ON fsp.product_id = v.product_id AND (fsp.variant_id IS NULL OR fsp.variant_id = v.id) ";

            List<Map<String, Object>> items;
            boolean isBuyNow = (buyNowVariantId != null && buyNowQty != null);

            if (isBuyNow) {
                // Lấy sản phẩm trực tiếp (Mua ngay)
                String buyNowSql = "SELECT v.id as variant_id, ? as quantity, v.price as original_price, " +
                        "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                        "FROM product_variants v " + fsJoinSubquery +
                        "WHERE v.id = ?";
                items = jdbc.queryForList(buyNowSql, buyNowQty, buyNowVariantId);
                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Sản phẩm không tồn tại!"));
                }
            } else if (payload.containsKey("cartItemIds") && payload.get("cartItemIds") != null && !((List<?>) payload.get("cartItemIds")).isEmpty()) {
                @SuppressWarnings("unchecked")
                List<Object> cartItemIds = (List<Object>) payload.get("cartItemIds");
                String inSql = cartItemIds.stream().map(id -> "?").collect(java.util.stream.Collectors.joining(","));
                String cartSql = "SELECT ci.product_variant_id as variant_id, ci.quantity, v.price as original_price, " +
                        "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                        "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id " + fsJoinSubquery +
                        "WHERE ci.user_id = ? AND ci.id IN (" + inSql + ")";
                List<Object> queryParams = new java.util.ArrayList<>();
                queryParams.add(accountId);
                queryParams.addAll(cartItemIds);
                items = jdbc.queryForList(cartSql, queryParams.toArray());

                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Không tìm thấy sản phẩm được chọn trong giỏ hàng!"));
                }
            } else if (payload.containsKey("items") && payload.get("items") != null) {
                // Lấy danh sách sản phẩm truyền trực tiếp từ client payload (cho mobile)
                List<Map<String, Object>> payloadItems = (List<Map<String, Object>>) payload.get("items");
                items = new java.util.ArrayList<>();
                for (Map<String, Object> pi : payloadItems) {
                    Integer vId = ((Number) pi.get("variantId")).intValue();
                    Integer qty = ((Number) pi.get("quantity")).intValue();
                    String priceSql = "SELECT v.id as variant_id, ? as quantity, v.price as original_price, " +
                            "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                            "FROM product_variants v " + fsJoinSubquery +
                            "WHERE v.id = ?";
                    List<Map<String, Object>> singleItem = jdbc.queryForList(priceSql, qty, vId);
                    if (!singleItem.isEmpty()) {
                        items.add(singleItem.get(0));
                    }
                }
                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Danh sách sản phẩm không hợp lệ!"));
                }
            } else {
                // Lấy danh sách sản phẩm từ giỏ hàng thực tế
                String cartSql = "SELECT ci.product_variant_id as variant_id, ci.quantity, v.price as original_price, " +
                        "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                        "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id " + fsJoinSubquery +
                        "WHERE ci.user_id = ?";
                items = jdbc.queryForList(cartSql, accountId);

                if (items.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Giỏ hàng của bạn đang trống!"));
                }
            }

            // Tách các dòng sản phẩm thành dòng Flash Sale và dòng giá gốc (nếu mua vượt quá giới hạn SL)
            items = com.ShoeStore.util.FlashSalePriceUtil.processAndSplitList(items);

            double total = items.stream()
                    .mapToDouble(item -> ((Number) item.get("price")).doubleValue() * ((Number) item.get("quantity")).intValue())
                    .sum();

            double tempShipping = shippingFee != null ? shippingFee : 30000;
            Integer userRankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            if (userRankId == null) {
                Integer points = jdbc.queryForObject("SELECT COALESCE(points, 0) FROM accounts WHERE id = ?", Integer.class, accountId);
                int pts = points != null ? points : 0;
                java.util.List<Integer> rankIds = jdbc.queryForList("SELECT id FROM membership_ranks WHERE min_points <= ? ORDER BY min_points DESC", Integer.class, pts);
                if (!rankIds.isEmpty()) {
                    userRankId = rankIds.get(0);
                    jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", userRankId, accountId);
                }
            }
            if (userRankId != null) {
                Boolean freeShip = jdbc.queryForObject(
                        "SELECT COALESCE(free_shipping, 0) FROM membership_ranks WHERE id = ?", Boolean.class, userRankId);
                if (Boolean.TRUE.equals(freeShip)) {
                    tempShipping = 0;
                }
            }
            final double shipping = tempShipping;

            // Kiểm tra voucher (Item-Level Discount: Bỏ qua các sản phẩm thuộc Flash Sale)
            double discount = 0;
            Voucher voucher = null;
            if (voucherCode != null && !voucherCode.trim().isEmpty()) {
                double eligibleSubtotal = 0.0;
                for (Map<String, Object> item : items) {
                    Integer vId = ((Number) item.get("variant_id")).intValue();
                    double price = ((Number) item.get("price")).doubleValue();
                    int qty = ((Number) item.get("quantity")).intValue();

                    String checkFsSql = "SELECT COUNT(*) FROM flash_sale_products fsp " +
                            "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                            "JOIN product_variants v ON v.product_id = fsp.product_id " +
                            "WHERE v.id = ? AND fs.status = 1 " +
                            "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                            "AND (fsp.quantity_limit = 0 OR fsp.quantity_limit IS NULL OR fsp.sold_quantity < fsp.quantity_limit)";
                    Integer fsCount = jdbc.queryForObject(checkFsSql, Integer.class, vId);

                    if (fsCount == null || fsCount == 0) {
                        eligibleSubtotal += price * qty;
                    }
                }

                Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
                java.util.Optional<Voucher> voucherOpt = voucherService.validateVoucher(voucherCode, rankId, total, accountId);
                if (voucherOpt.isPresent()) {
                    voucher = voucherOpt.get();
                    discount = voucherService.calculateDiscount(voucher, total, eligibleSubtotal);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mã giảm giá '" + voucherCode + "' không hợp lệ, đã hết hạn, chưa đủ điều kiện hoặc đã hết lượt sử dụng!"));
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

            // Thêm order items & Cập nhật số lượng đã bán (sold_quantity) Flash Sale
            for (Map<String, Object> item : items) {
                Integer variantId = ((Number) item.get("variant_id")).intValue();
                Integer buyQty = ((Number) item.get("quantity")).intValue();
                Double price = ((Number) item.get("price")).doubleValue();

                jdbc.update(
                        "INSERT INTO order_items (order_id, product_variant_id, quantity, price) VALUES (?, ?, ?, ?)",
                        orderId, variantId, buyQty, price);

                int fsQtyUsed = item.get("flashSaleQtyUsed") != null ? ((Number) item.get("flashSaleQtyUsed")).intValue() : 0;
                if (fsQtyUsed > 0) {
                    jdbc.update("UPDATE fsp SET sold_quantity = ISNULL(fsp.sold_quantity, 0) + ? " +
                            "FROM flash_sale_products fsp " +
                            "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                            "JOIN product_variants v ON v.product_id = fsp.product_id " +
                            "WHERE v.id = ? AND fs.status = 1 AND GETDATE() BETWEEN fs.start_date AND fs.end_date",
                            fsQtyUsed, variantId);
                }
            }

            // Trừ tồn kho sản phẩm ngay khi đặt hàng
            orderService.updateInventory(orderCode);
            // Cập nhật Voucher
            if (voucher != null) {
                jdbc.update("UPDATE vouchers SET quantity = quantity - 1 WHERE id = ?", voucher.getId());
                jdbc.update("INSERT INTO voucher_usages (voucher_id, user_id, used_at) VALUES (?, ?, GETDATE())",
                        voucher.getId(), accountId);
            }

            // Xóa các sản phẩm đã được đặt hàng khỏi giỏ hàng
            if (!isBuyNow) {
                if (payload.containsKey("cartItemIds") && payload.get("cartItemIds") != null && !((List<?>) payload.get("cartItemIds")).isEmpty()) {
                    @SuppressWarnings("unchecked")
                    List<Object> cartItemIds = (List<Object>) payload.get("cartItemIds");
                    String inSql = cartItemIds.stream().map(id -> "?").collect(java.util.stream.Collectors.joining(","));
                    List<Object> delParams = new java.util.ArrayList<>();
                    delParams.add(accountId);
                    delParams.addAll(cartItemIds);
                    jdbc.update("DELETE FROM cart_items WHERE user_id = ? AND id IN (" + inSql + ")", delParams.toArray());
                } else if (!payload.containsKey("items")) {
                    jdbc.update("DELETE FROM cart_items WHERE user_id = ?", accountId);
                }
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

                    jdbc.update("UPDATE orders SET external_transaction_id = ?, payment_status = 1 WHERE order_code = ?", String.valueOf(payosOrderCode), orderCode);

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
        String cancelReason = (String) payload.get("cancelReason");
        String bankBin = (String) payload.get("bankBin");
        String bankAccount = (String) payload.get("bankAccount");
        String accountName = (String) payload.get("accountName");
        Long userId = ((Number) account.get("id")).longValue();

        try {
            orderService.cancelOrder(orderCode, userId, cancelReason, bankBin, bankAccount, accountName);
            return ResponseEntity.ok(Map.of("success", true, "message", "Hủy đơn hàng và xử lý hoàn tiền thành công!"));
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

                // Khôi phục tồn kho vì đã bị trừ lúc đặt hàng
                orderService.restoreInventory(actualOrderCode);

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
        String cancelReason = (String) payload.get("cancelReason");

        if (orderCode == null || status == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode hoặc status!"));
        }

        try {
            if (status == 3) {
                int currentStatus = orderService.getOrderStatus(orderCode);
                if (currentStatus != 5) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "Admin chỉ có thể xác nhận 'Thành công' sau khi khách hàng đã nhấn 'Đã nhận hàng' (Trạng thái: Đã nhận hàng)."));
                }
            }

            // Nếu admin hủy đơn thì dùng cancelOrderByAdmin để kiểm tra quyền và lưu lý do
            if (status == 4) {
                orderService.cancelOrderByAdmin(orderCode, cancelReason);
            } else {
                orderService.updateOrderStatus(orderCode, status);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật trạng thái đơn hàng thành công!"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật trạng thái đơn hàng: " + e.getMessage()));
        }
    }

    // 9. XÓA SẢN PHẨM KHỎI ĐƠN HÀNG (CHỈ CHO PHÉP KHI ĐƠN HÀNG CHỜ XÁC NHẬN)
    @PostMapping("/delete-item")
    public ResponseEntity<?> deleteOrderItem(@RequestBody Map<String, Object> payload) {
        String orderCode = (String) payload.get("orderCode");
        Object varIdObj = payload.get("variantId");

        if (orderCode == null || varIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode hoặc variantId!"));
        }

        try {
            Integer variantId = Integer.parseInt(varIdObj.toString());
            Map<String, Object> result = orderService.deleteOrderItem(orderCode, variantId);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xóa sản phẩm khỏi đơn hàng: " + e.getMessage()));
        }
    }

    // 10. ADMIN XÁC NHẬN ĐÃ HOÀN TIỀN CHO ĐƠN HÀNG HỦY (HỖ TRỢ PAYOS PAYOUT TỰ ĐỘNG CHUYỂN TIỀN)
    @PostMapping("/confirm-refund")
    public ResponseEntity<?> confirmRefund(@RequestBody Map<String, Object> payload) {
        String orderCode = (String) payload.get("orderCode");
        String bankBin = (String) payload.get("bankBin");
        String bankAccount = (String) payload.get("bankAccount");
        String accountName = (String) payload.get("accountName");

        if (orderCode == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode!"));
        }

        try {
            orderService.confirmRefund(orderCode, bankBin, bankAccount, accountName);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xác nhận và chuyển hoàn tiền thành công qua PayOS cho đơn hàng " + orderCode + "!"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi hoàn tiền PayOS: " + e.getMessage()));
        }
    }

    // 10.1 ADMIN TỪ CHỐI HOÀN TIỀN
    @PostMapping("/reject-refund")
    public ResponseEntity<?> rejectRefund(@RequestBody Map<String, Object> payload) {
        String orderCode = (String) payload.get("orderCode");
        String rejectReason = (String) payload.get("rejectReason");

        if (orderCode == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu orderCode!"));
        }

        try {
            orderService.rejectRefund(orderCode, rejectReason);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã từ chối hoàn tiền cho đơn hàng " + orderCode + "!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xử lý từ chối hoàn tiền: " + e.getMessage()));
        }
    }

    // 11. TỰ ĐỘNG LẤY THÔNG TIN TÀI KHOẢN NGÂN HÀNG NGƯỜI CHUYỂN TIỀN TỪ PAYOS
    @GetMapping("/{orderCode}/payos-info")
    public ResponseEntity<?> getPayOSPaymentInfo(@PathVariable String orderCode) {
        try {
            Map<String, Object> orderDetail = orderService.getOrderDetail(orderCode);
            if (orderDetail == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Không tìm thấy đơn hàng!"));
            }

            String extTxId = orderDetail.get("external_transaction_id") != null ? orderDetail.get("external_transaction_id").toString() : null;
            if (extTxId == null || extTxId.trim().isEmpty() || payOS == null) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Đơn hàng không có mã giao dịch PayOS"));
            }

            vn.payos.model.v2.paymentRequests.PaymentLink paymentLink;
            try {
                paymentLink = payOS.paymentRequests().get(Long.parseLong(extTxId));
            } catch (NumberFormatException nfe) {
                paymentLink = payOS.paymentRequests().get(extTxId);
            }

            if (paymentLink != null && paymentLink.getTransactions() != null && !paymentLink.getTransactions().isEmpty()) {
                vn.payos.model.v2.paymentRequests.Transaction tx = paymentLink.getTransactions().get(0);
                Map<String, Object> txData = new HashMap<>();
                txData.put("counterAccountBankId", tx.getCounterAccountBankId());
                txData.put("counterAccountBankName", tx.getCounterAccountBankName());
                txData.put("counterAccountName", tx.getCounterAccountName());
                txData.put("counterAccountNumber", tx.getCounterAccountNumber());
                txData.put("amountPaid", paymentLink.getAmountPaid());
                return ResponseEntity.ok(Map.of("success", true, "payosInfo", txData));
            }

            return ResponseEntity.ok(Map.of("success", false, "message", "Chưa tìm thấy giao dịch chuyển tiền trên PayOS"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Không thể lấy thông tin PayOS: " + e.getMessage()));
        }
    }
}
