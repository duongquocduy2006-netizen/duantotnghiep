package com.ShoeStore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.ShoeStore.model.Voucher;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;

@Controller
public class CheckoutController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private com.ShoeStore.service.VoucherService voucherService;

    @Autowired
    private com.ShoeStore.service.OrderService orderService;

    @Autowired
    private vn.payos.PayOS payOS;

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            jdbc.execute(
                    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'cancel_reason') "
                            +
                            "ALTER TABLE orders ADD cancel_reason NVARCHAR(500) NULL;");
            jdbc.execute(
                    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'external_transaction_id') "
                            +
                            "ALTER TABLE orders ADD external_transaction_id NVARCHAR(255);");
            jdbc.execute(
                    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'voucher_id') "
                            +
                            "ALTER TABLE orders ADD voucher_id INT;");
        } catch (Exception e) {
            System.err.println("Error updating orders table schema: " + e.getMessage());
        }
    }

    @PostMapping("/checkout/apply-voucher")
    public String applyVoucher(@RequestParam("voucherCode") String code, HttpSession session, RedirectAttributes ra) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (code == null || code.trim().isEmpty()) {
            session.removeAttribute("appliedVoucher");
            ra.addFlashAttribute("voucherError", "Vui lòng nhập mã giảm giá!");
            return "redirect:/checkout" + (session.getAttribute("quickCheckout") != null ? "?mode=quick" : "");
        }

        // Get actual rank from DB to be sure
        Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class,
                account.get("id"));

        // Need to calculate current total to validate minOrderValue
        Double total = calculateCartTotal(session, ((Number) account.get("id")).longValue());

        Optional<Voucher> voucherOpt = voucherService.validateVoucher(code, rankId, total,
                ((Number) account.get("id")).longValue());
        if (voucherOpt.isPresent()) {
            session.setAttribute("appliedVoucher", voucherOpt.get());
            ra.addFlashAttribute("voucherSuccess", "Áp dụng mã giảm giá thành công!");
        } else {
            session.removeAttribute("appliedVoucher");
            ra.addFlashAttribute("voucherError", "Mã giảm giá không hợp lệ, hết hạn hoặc không đủ điều kiện!");
        }
        return "redirect:/checkout" + (session.getAttribute("quickCheckout") != null ? "?mode=quick" : "");
    }

    private Double calculateCartTotal(HttpSession session, Long accountId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> quickInfo = (Map<String, Object>) session.getAttribute("quickCheckout");
        if (quickInfo != null) {
            String quickPriceSql = "SELECT ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                    "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as effective_price " +
                    "FROM product_variants v WHERE v.id = ?";
            Map<String, Object> item = jdbc.queryForMap(quickPriceSql, quickInfo.get("variantId"));
            return ((Number) item.get("effective_price")).doubleValue()
                    * ((Number) quickInfo.get("quantity")).intValue();
        } else {
            String cartTotalSql = "SELECT ci.quantity, " +
                    "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                    "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as effective_price " +
                    "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id WHERE ci.user_id = ?";
            List<Map<String, Object>> items = jdbc.queryForList(cartTotalSql, accountId);
            return items.stream()
                    .mapToDouble(i -> ((Number) i.get("effective_price")).doubleValue()
                            * ((Number) i.get("quantity")).intValue())
                    .sum();
        }
    }

    @GetMapping("/checkout/quick")
    public String quickCheckout(
            @RequestParam("variantId") Long variantId,
            @RequestParam("quantity") Integer quantity,
            HttpSession session) {
        Map<String, Object> quickInfo = new HashMap<>();
        quickInfo.put("variantId", variantId);
        quickInfo.put("quantity", quantity);
        session.setAttribute("quickCheckout", quickInfo);
        return "redirect:/checkout?mode=quick";
    }

    @GetMapping("/checkout")
    public String checkout(
            @RequestParam(value = "mode", required = false) String mode,
            HttpSession session, Model model) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return "redirect:/login";
        }

        Long accountId = ((Number) account.get("id")).longValue();

        if ("quick".equals(mode)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> quickInfo = (Map<String, Object>) session.getAttribute("quickCheckout");
            if (quickInfo == null)
                return "redirect:/cart";

            populateQuickCheckoutModel(model, (Long) quickInfo.get("variantId"), (Integer) quickInfo.get("quantity"));
        } else {
            populateCheckoutModel(model, accountId);
            session.removeAttribute("quickCheckout");
        }

        // --- Fetch Rank and Voucher Logic for Display ---
        Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class,
                accountId);
        Double totalPrice = (Double) model.asMap().get("totalPrice");
        Double shippingFee = 30000.0;
        if (rankId != null) {
            Boolean freeShip = jdbc.queryForObject(
                    "SELECT COALESCE(free_shipping, 0) FROM membership_ranks WHERE id = ?", Boolean.class, rankId);
            if (Boolean.TRUE.equals(freeShip)) {
                shippingFee = 0.0;
            }
        }
        Double discount = 0.0;

        Voucher voucher = (Voucher) session.getAttribute("appliedVoucher");
        if (voucher != null) {
            discount = voucherService.calculateDiscount(voucher, totalPrice);
            model.addAttribute("appliedVoucherCode", voucher.getCode());
            model.addAttribute("appliedVoucher", voucher);
        }

        // Bỏ điều kiện min_order_value <= ? để hiện tất cả Voucher đang có, cho khách
        // biết để còn mua thêm
        String voucherSql = "SELECT DISTINCT v.code as code, v.discount_value as discount_value, " +
                "v.discount_type as discount_type, v.max_discount as max_discount, " +
                "v.min_order_value as min_order_value " +
                "FROM vouchers v " +
                "LEFT JOIN voucher_membership_ranks vmr ON v.id = vmr.voucher_id " +
                "WHERE v.status = 1 AND v.quantity > 0 " +
                "AND (v.start_date IS NULL OR GETDATE() >= v.start_date) " +
                "AND (v.end_date IS NULL OR GETDATE() <= v.end_date) " +
                "AND (vmr.rank_id IS NULL OR vmr.rank_id = ?)";

        List<Map<String, Object>> validVouchers = jdbc.queryForList(voucherSql, rankId);
        model.addAttribute("validVouchers", validVouchers);

        model.addAttribute("account", account);
        model.addAttribute("shippingFee", shippingFee);
        model.addAttribute("discount", discount);
        model.addAttribute("finalTotal", totalPrice + shippingFee - discount);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cartItems = (List<Map<String, Object>>) model.asMap().get("cartItems");
        if (cartItems == null || cartItems.isEmpty()) {
            return "redirect:/cart";
        }

        return "client/checkout";
    }

    private void populateQuickCheckoutModel(Model model, Long variantId, Integer quantity) {
        String sql = "SELECT v.id as variant_id, p.id as product_id, " +
                "p.product_name, s.size_name, col.color_name, " +
                "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                "WHERE fsp.product_id = p.id AND fs.status = 1 " +
                "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price, " +
                "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url "
                +
                "FROM product_variants v " +
                "JOIN products p ON v.product_id = p.id " +
                "JOIN sizes s ON v.size_id = s.id " +
                "JOIN colors col ON v.color_id = col.id " +
                "WHERE v.id = ?";

        Map<String, Object> item = jdbc.queryForMap(sql, variantId);
        item.put("quantity", quantity);
        item.put("id", -1);

        List<Map<String, Object>> cartItems = List.of(item);
        double total = ((Number) item.get("price")).doubleValue() * quantity;

        model.addAttribute("cartItems", cartItems);
        model.addAttribute("totalPrice", total);
    }

    private void populateCheckoutModel(Model model, Long accountId) {
        String sql = "SELECT ci.id, ci.quantity, ci.product_variant_id as variant_id, p.id as product_id, " +
                "p.product_name, s.size_name, col.color_name, " +
                "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                "WHERE fsp.product_id = p.id AND fs.status = 1 " +
                "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price, " +
                "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url "
                +
                "FROM cart_items ci " +
                "JOIN product_variants v ON ci.product_variant_id = v.id " +
                "JOIN products p ON v.product_id = p.id " +
                "JOIN sizes s ON v.size_id = s.id " +
                "JOIN colors col ON v.color_id = col.id " +
                "WHERE ci.user_id = ?";

        List<Map<String, Object>> cartItems = jdbc.queryForList(sql, accountId);
        double total = cartItems.stream()
                .mapToDouble(
                        item -> ((Number) item.get("price")).doubleValue() * ((Number) item.get("quantity")).intValue())
                .sum();

        model.addAttribute("cartItems", cartItems);
        model.addAttribute("totalPrice", total);
    }

    @PostMapping("/checkout/place-order")
    public String placeOrder(
            @RequestParam("fullName") String fullName,
            @RequestParam("phone") String phone,
            @RequestParam("fullAddress") String fullAddress,
            @RequestParam("shippingFee") Double shippingFee,
            @RequestParam("note") String note,
            @RequestParam("paymentMethod") String paymentMethod,
            HttpSession session,
            Model model,
            RedirectAttributes ra,
            jakarta.servlet.http.HttpServletRequest request) {

        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null)
            return "redirect:/login";

        Long accountId = ((Number) account.get("id")).longValue();

        @SuppressWarnings("unchecked")
        Map<String, Object> quickInfo = (Map<String, Object>) session.getAttribute("quickCheckout");
        List<Map<String, Object>> items;

        if (quickInfo != null) {
            String quickSql = "SELECT v.id as variant_id, " +
                    "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                    "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price " +
                    "FROM product_variants v WHERE v.id = ?";
            Map<String, Object> item = jdbc.queryForMap(quickSql, quickInfo.get("variantId"));
            item.put("quantity", quickInfo.get("quantity"));
            items = List.of(item);
        } else {
            String cartSql = "SELECT ci.product_variant_id as variant_id, ci.quantity, " +
                    "ISNULL((SELECT fsp.sale_price FROM flash_sale_products fsp " +
                    "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "WHERE fsp.product_id = v.product_id AND fs.status = 1 " +
                    "AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    "AND fsp.sold_quantity < fsp.quantity_limit), v.price) as price " +
                    "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id " +
                    "WHERE ci.user_id = ?";
            items = jdbc.queryForList(cartSql, accountId);
        }

        if (items.isEmpty())
            return "redirect:/cart";

        double total = items.stream()
                .mapToDouble(
                        item -> ((Number) item.get("price")).doubleValue() * ((Number) item.get("quantity")).intValue())
                .sum();

        double shipping = 30000;
        if (shippingFee != null) {
            shipping = shippingFee;
        } else {
            Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class,
                    accountId);
            if (rankId != null) {
                Boolean freeShip = jdbc.queryForObject(
                        "SELECT COALESCE(free_shipping, 0) FROM membership_ranks WHERE id = ?", Boolean.class, rankId);
                if (Boolean.TRUE.equals(freeShip)) {
                    shipping = 0;
                }
            }
        }

        // --- Apply Voucher Discount ---
        double discount = 0;
        Voucher voucher = (Voucher) session.getAttribute("appliedVoucher");
        if (voucher != null) {
            Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            Optional<Voucher> validOpt = voucherService.validateVoucher(voucher.getCode(), rankId, total, accountId);
            if (validOpt.isPresent()) {
                voucher = validOpt.get();
                discount = voucherService.calculateDiscount(voucher, total);
            } else {
                session.removeAttribute("appliedVoucher");
                ra.addFlashAttribute("error", "Mã giảm giá '" + voucher.getCode() + "' không còn hiệu lực, chưa đủ điều kiện hoặc đã hết lượt sử dụng!");
                return "redirect:/checkout";
            }
        }

        double finalTotal = total + shipping - discount;

        try {
            Integer pmId;
            try {
                pmId = jdbc.queryForObject(
                        "SELECT TOP 1 id FROM payment_methods WHERE method_name LIKE ? OR ? LIKE '%' + method_name + '%'",
                        Integer.class, "%" + paymentMethod + "%", paymentMethod);
            } catch (Exception e) {
                pmId = 1;
            }

            String addressSql = "INSERT INTO addresses (receiving_name, phone_number, street_detail, is_default, user_id) VALUES (?, ?, ?, 0, ?)";
            jdbc.update(addressSql, fullName, phone, fullAddress, accountId);

            Long addressId = jdbc.queryForObject("SELECT TOP 1 id FROM addresses WHERE user_id = ? ORDER BY id DESC",
                    Long.class, accountId);

            long timestamp = System.currentTimeMillis() / 1000;
            String orderCode = "ORD-" + timestamp;

            String orderSql = "INSERT INTO orders (order_code, user_id, total_amount, shipping_fee, final_amount, receiver_address_id, payment_method_id, status, created_at, voucher_id) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, 1, GETDATE(), ?)";

            final Integer finalPmId = pmId;
            final Voucher finalVoucher = voucher;
            final double finalShipping = shipping;

            org.springframework.jdbc.support.GeneratedKeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
            jdbc.update(connection -> {
                java.sql.PreparedStatement ps = connection.prepareStatement(orderSql, new String[] { "id" });
                ps.setString(1, orderCode);
                ps.setLong(2, accountId);
                ps.setDouble(3, total);
                ps.setDouble(4, finalShipping);
                ps.setDouble(5, finalTotal);
                ps.setLong(6, addressId);
                ps.setInt(7, finalPmId);
                if (finalVoucher != null)
                    ps.setInt(8, finalVoucher.getId());
                else
                    ps.setNull(8, java.sql.Types.INTEGER);
                return ps;
            }, keyHolder);

            Long orderId = keyHolder.getKey().longValue();

            for (Map<String, Object> item : items) {
                Integer variantId = ((Number) item.get("variant_id")).intValue();
                Integer buyQty = ((Number) item.get("quantity")).intValue();
                Double price = ((Number) item.get("price")).doubleValue();

                jdbc.update(
                        "INSERT INTO order_items (order_id, product_variant_id, quantity, price) VALUES (?, ?, ?, ?)",
                        orderId, variantId, buyQty, price);
            }

            // Trừ tồn kho sản phẩm ngay khi đặt hàng
            orderService.updateInventory(orderCode);

            // --- Post-Order Actions ---
            if (voucher != null) {
                jdbc.update("UPDATE vouchers SET quantity = quantity - 1 WHERE id = ?", voucher.getId());
                jdbc.update("INSERT INTO voucher_usages (voucher_id, user_id, used_at) VALUES (?, ?, GETDATE())",
                        voucher.getId(), accountId);
                session.removeAttribute("appliedVoucher");
            }

            if (quickInfo != null) {
                session.removeAttribute("quickCheckout");
            } else {
                jdbc.update("DELETE FROM cart_items WHERE user_id = ?", accountId);
            }

            // --- ONLINE PAYMENT LOGIC (PayOS) ---
            // Tự động lấy baseUrl để link quay về hoạt động đúng kể cả khi chạy trên IP
            // khác hoặc domain
            String scheme = request.getScheme();
            String serverName = request.getServerName();
            int serverPort = request.getServerPort();
            String baseUrl = scheme + "://" + serverName
                    + (serverPort == 80 || serverPort == 443 ? "" : ":" + serverPort);

            String returnUrl = baseUrl + "/checkout/success";
            String cancelUrl = baseUrl + "/checkout/payment-cancel?orderCode=" + orderCode;

            if ("BANK".equalsIgnoreCase(paymentMethod)) {
                try {
                    // Sử dụng cùng một timestamp để đồng nhất mã đơn hàng giữa PayOS và Database
                    long payosOrderCode = timestamp;
                    long finalAmountLong = (long) finalTotal;

                    PaymentLinkItem item = PaymentLinkItem.builder()
                            .name("Thanh toán đơn hàng " + orderCode)
                            .quantity(1)
                            .price(finalAmountLong)
                            .build();

                    CreatePaymentLinkRequest paymentData = CreatePaymentLinkRequest.builder()
                            .orderCode(payosOrderCode)
                            .amount(finalAmountLong)
                            .description("TT DH " + orderCode)
                            .item(item)
                            .returnUrl(returnUrl)
                            .cancelUrl(cancelUrl)
                            .build();

                    CreatePaymentLinkResponse checkoutResponseData = payOS.paymentRequests().create(paymentData);
                    String checkoutUrl = checkoutResponseData.getCheckoutUrl();

                    jdbc.update("UPDATE orders SET external_transaction_id = ? WHERE order_code = ?",
                            String.valueOf(payosOrderCode), orderCode);

                    return "redirect:" + checkoutUrl;
                } catch (Exception e) {
                    e.printStackTrace();
                    ra.addFlashAttribute("error", "Lỗi kết nối PayOS: " + e.getMessage());
                    return "redirect:/checkout";
                }
            }

            ra.addFlashAttribute("orderCode", orderCode);
            return "redirect:/checkout/success";

        } catch (Exception e) {
            e.printStackTrace();
            return "redirect:/checkout?error=order_failed";
        }
    }

    @GetMapping("/checkout/payment-success")
    public String paymentSuccess(@RequestParam("orderCode") String orderCode, RedirectAttributes ra) {
        // Cập nhật trạng thái đơn hàng thành "Đã thanh toán" (ví dụ status = 2)
        // Hoặc cứ để status = 1 (Chờ xác nhận) nhưng ghi chú là đã thanh toán
        jdbc.update("UPDATE orders SET status = 2 WHERE order_code = ?", orderCode);
        ra.addFlashAttribute("orderCode", orderCode);
        ra.addFlashAttribute("paymentStatus", "success");
        return "redirect:/checkout/success";
    }

    @GetMapping("/checkout/payment-cancel")
    public String paymentCancel(@RequestParam("orderCode") String orderCode, RedirectAttributes ra) {
        System.out.println("Processing Payment Cancel for Order Code: " + orderCode);
        try {
            // 1. Lấy thông tin đơn hàng (Thử tìm theo order_code thủ công hoặc
            // external_transaction_id từ PayOS)
            List<Map<String, Object>> orders = jdbc.queryForList(
                    "SELECT id, user_id, voucher_id, order_code FROM orders WHERE order_code = ? OR external_transaction_id = ?",
                    orderCode, orderCode);

            if (orders.isEmpty()) {
                System.out.println("No order found with code/transaction ID: " + orderCode);
                ra.addFlashAttribute("error",
                        "Đơn hàng không tồn tại hoặc đã được xử lý trước đó (Mã: " + orderCode + ")");
                return "redirect:/cart";
            }

            Map<String, Object> order = orders.get(0);
            Long orderId = ((Number) order.get("id")).longValue();
            Long userId = ((Number) order.get("user_id")).longValue();
            Integer vId = (Integer) order.get("voucher_id");
            String actualOrderCode = (String) order.get("order_code");

            System.out.println("Identified Order ID: " + orderId + " for User ID: " + userId);

            // Khôi phục tồn kho sản phẩm trước khi xóa đơn hàng nháp
            orderService.restoreInventory(actualOrderCode);

            // 2. Khôi phục giỏ hàng
            List<Map<String, Object>> items = jdbc
                    .queryForList("SELECT product_variant_id, quantity FROM order_items WHERE order_id = ?", orderId);
            for (Map<String, Object> item : items) {
                int count = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM cart_items WHERE user_id = ? AND product_variant_id = ?", Integer.class,
                        userId, item.get("product_variant_id"));
                if (count > 0) {
                    jdbc.update(
                            "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_variant_id = ?",
                            item.get("quantity"), userId, item.get("product_variant_id"));
                } else {
                    jdbc.update("INSERT INTO cart_items (user_id, product_variant_id, quantity) VALUES (?, ?, ?)",
                            userId, item.get("product_variant_id"), item.get("quantity"));
                }
            }
            System.out.println("Restored " + items.size() + " items to cart.");

            // 3. Khôi phục Voucher và xóa lượt dùng
            if (vId != null) {
                jdbc.update("UPDATE vouchers SET quantity = quantity + 1 WHERE id = ?", vId);
                jdbc.update(
                        "DELETE TOP (1) FROM voucher_usages WHERE voucher_id = ? AND user_id = ? ORDER BY used_at DESC",
                        vId, userId);
                System.out.println("Reverted voucher usage for ID: " + vId);
            }

            // 4. XÓA ĐƠN HÀNG (Bắt buộc xóa sạch theo ý sếp)
            // Xóa ở các bảng phụ liên quan nếu có (Hiện tại có order_items)
            jdbc.update("DELETE FROM order_items WHERE order_id = ?", orderId);
            int deleted = jdbc.update("DELETE FROM orders WHERE id = ?", orderId);

            if (deleted > 0) {
                System.out.println("Successfully DELETED order from database.");
            } else {
                System.out.println("Failed to delete order from database (already gone?)");
            }

            ra.addFlashAttribute("error",
                    "Đặt hàng không thành công. Giao dịch thanh toán PayOS đã bị khách hàng hủy.");
            return "redirect:/checkout";
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR during Payment Cancel: " + e.getMessage());
            e.printStackTrace();
            ra.addFlashAttribute("error", "Có lỗi xảy ra khi xử lý việc hủy đơn hàng.");
            return "redirect:/cart";
        }
    }

    @GetMapping("/checkout/success")
    public String success() {
        return "client/checkout-success";
    }
}
