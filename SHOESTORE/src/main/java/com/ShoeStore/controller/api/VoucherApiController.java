package com.ShoeStore.controller.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import com.ShoeStore.model.Voucher;
import com.ShoeStore.repository.MembershipRankRepository;
import com.ShoeStore.service.VoucherService;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vouchers")
public class VoucherApiController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private MembershipRankRepository rankRepo;

    // 1. LẤY DANH SÁCH VOUCHER KHẢ DỤNG CHO USER KHI ĐẶT HÀNG / XEM DANH SÁCH
    @GetMapping
    public ResponseEntity<?> getAvailableVouchers(
            HttpSession session,
            @RequestParam(required = false) Integer rankId,
            @RequestParam(required = false) Long accountId) {
        try {
            StringBuilder sql = new StringBuilder(
                    "SELECT DISTINCT v.id, v.code, v.discount_value, v.discount_type, v.max_discount, " +
                    "v.min_order_value, v.start_date, v.end_date, v.quantity, v.status, " +
                    "(SELECT TOP 1 mr.rank_name FROM voucher_membership_ranks vmr JOIN membership_ranks mr ON vmr.rank_id = mr.id WHERE vmr.voucher_id = v.id) as rank_name, " +
                    "(SELECT TOP 1 mr.min_points FROM voucher_membership_ranks vmr JOIN membership_ranks mr ON vmr.rank_id = mr.id WHERE vmr.voucher_id = v.id) as min_points " +
                    "FROM vouchers v " +
                    "WHERE (v.status IS NULL OR v.status = 1) " +
                    "AND (v.quantity IS NULL OR v.quantity > 0) " +
                    "AND (v.start_date IS NULL OR GETDATE() >= v.start_date) " +
                    "AND (v.end_date IS NULL OR GETDATE() <= v.end_date) ");

            List<Object> params = new java.util.ArrayList<>();
            Integer currentRankId = rankId;
            if (accountId != null) {
                try {
                    Integer totalPoints = jdbc.queryForObject("SELECT points FROM accounts WHERE id = ?", Integer.class, accountId);
                    if (totalPoints != null) {
                        List<Map<String, Object>> ranks = jdbc.queryForList("SELECT id, min_points FROM membership_ranks ORDER BY min_points DESC");
                        for (Map<String, Object> r : ranks) {
                            if (totalPoints >= ((Number) r.get("min_points")).intValue()) {
                                currentRankId = ((Number) r.get("id")).intValue();
                                break;
                            }
                        }
                    }
                    if (currentRankId == null) {
                        currentRankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
                    }
                } catch (Exception e) {
                    System.out.println("Error calculating rank in getAvailableVouchers: " + e.getMessage());
                }
            }

            if (currentRankId != null) {
                sql.append("AND (NOT EXISTS (SELECT 1 FROM voucher_membership_ranks vmr WHERE vmr.voucher_id = v.id) " +
                           "OR EXISTS (SELECT 1 FROM voucher_membership_ranks vmr WHERE vmr.voucher_id = v.id AND vmr.rank_id = ?)) ");
                params.add(currentRankId);
            }

            if (accountId != null) {
                sql.append("AND (v.user_usage_limit IS NULL OR v.user_usage_limit <= 0 OR " +
                        "(SELECT COUNT(*) FROM voucher_usages vu WHERE vu.voucher_id = v.id AND vu.user_id = ?) < v.user_usage_limit) ");
                params.add(accountId);
            }
            sql.append("ORDER BY v.id DESC");

            List<Map<String, Object>> vouchers = jdbc.queryForList(sql.toString(), params.toArray());
            return ResponseEntity.ok(Map.of("success", true, "vouchers", vouchers));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách voucher: " + e.getMessage()));
        }
    }

    // 2. ÁP DỤNG VOUCHER CHO ĐƠN HÀNG (Item-Level Discount: Bỏ qua sản phẩm Flash Sale)
    @PostMapping("/apply")
    public ResponseEntity<?> applyVoucher(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        String code = (String) payload.get("voucherCode");
        Double cartTotal = payload.containsKey("cartTotal") && payload.get("cartTotal") != null ?
                ((Number) payload.get("cartTotal")).doubleValue() : null;

        if (code == null || code.trim().isEmpty() || cartTotal == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu voucherCode hoặc cartTotal!"));
        }

        Long accountId = ((Number) account.get("id")).longValue();
        Integer buyNowVariantId = payload.containsKey("buyNowVariantId") && payload.get("buyNowVariantId") != null ?
                ((Number) payload.get("buyNowVariantId")).intValue() : null;
        Integer buyNowQty = payload.containsKey("buyNowQty") && payload.get("buyNowQty") != null ?
                ((Number) payload.get("buyNowQty")).intValue() : null;

        try {
            // Compute Eligible Subtotal (excluding active Flash Sale items)
            List<Map<String, Object>> items;
            String fsSubquery = "LEFT JOIN ( " +
                    "    SELECT fsp.product_id, fsp.variant_id, fsp.id as fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                    "    FROM flash_sale_products fsp " +
                    "    JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    "    WHERE fs.status = 1 AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    ") fsp ON fsp.product_id = v.product_id AND (fsp.variant_id IS NULL OR fsp.variant_id = v.id) ";

            if (buyNowVariantId != null && buyNowQty != null) {
                String buyNowSql = "SELECT v.id as variant_id, ? as quantity, v.price as original_price, " +
                        "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                        "FROM product_variants v " + fsSubquery +
                        "WHERE v.id = ?";
                items = jdbc.queryForList(buyNowSql, buyNowQty, buyNowVariantId);
            } else {
                String cartSql = "SELECT ci.product_variant_id as variant_id, ci.quantity, v.price as original_price, " +
                        "fsp.fsp_id, fsp.sale_price, fsp.quantity_limit, fsp.sold_quantity " +
                        "FROM cart_items ci JOIN product_variants v ON ci.product_variant_id = v.id " + fsSubquery +
                        "WHERE ci.user_id = ?";
                items = jdbc.queryForList(cartSql, accountId);
            }

            double eligibleSubtotal = 0.0;
            int flashSaleCount = 0;
            int totalItemCount = items.size();

            List<Map<String, Object>> processedItems = com.ShoeStore.util.FlashSalePriceUtil.processAndSplitList(items);

            for (Map<String, Object> item : processedItems) {
                boolean isFs = Boolean.TRUE.equals(item.get("is_flash_sale"));
                int qty = ((Number) item.get("quantity")).intValue();
                double price = ((Number) item.get("price")).doubleValue();

                if (isFs) {
                    flashSaleCount += qty;
                } else {
                    eligibleSubtotal += price * qty;
                }
            }

            Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            com.ShoeStore.service.VoucherService.VoucherValidationResult vResult = voucherService.validateVoucherDetailed(code, rankId, cartTotal, accountId);

            if (vResult.isValid()) {
                Voucher voucher = vResult.getVoucher();
                if (eligibleSubtotal <= 0 && totalItemCount > 0) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "code", voucher.getCode(),
                            "discount", 0.0,
                            "eligibleSubtotal", 0.0,
                            "hasFlashSaleItems", true,
                            "voucher", voucher,
                            "message", "Mã giảm giá chỉ áp dụng cho sản phẩm không thuộc Flash Sale. Tất cả sản phẩm trong giỏ hàng đều đang thuộc Flash Sale!"
                    ));
                }

                double discount = voucherService.calculateDiscount(voucher, cartTotal, eligibleSubtotal);
                String successMsg = "Áp dụng mã giảm giá thành công!";
                if (flashSaleCount > 0) {
                    successMsg = "Áp dụng mã giảm giá thành công cho các sản phẩm không thuộc Flash Sale (bỏ qua " + flashSaleCount + " sản phẩm Flash Sale)!";
                }

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "code", voucher.getCode(),
                        "discount", discount,
                        "eligibleSubtotal", eligibleSubtotal,
                        "hasFlashSaleItems", flashSaleCount > 0,
                        "voucher", voucher,
                        "message", successMsg
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", vResult.getMessage()
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi kiểm tra voucher: " + e.getMessage()));
        }
    }

    // 3. LẤY TOÀN BỘ VOUCHER DÀNH CHO ADMIN
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllVouchersAdmin() {
        try {
            List<Voucher> list = voucherService.getAllVouchers();
            List<Map<String, Object>> vouchersMap = list.stream().map(v -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", v.getId());
                map.put("code", v.getCode());
                map.put("discountValue", v.getDiscountValue());
                map.put("discountType", "PERCENT"); // Bắt buộc giảm theo phần trăm
                map.put("maxDiscount", v.getMaxDiscount());
                map.put("minOrderValue", v.getMinOrderValue());
                map.put("quantity", v.getQuantity());
                map.put("status", v.getStatus() != null ? v.getStatus() : 1);
                map.put("userUsageLimit", v.getUserUsageLimit());
                map.put("startDate", v.getStartDate());
                map.put("endDate", v.getEndDate());
                
                // Applicable ranks
                List<Map<String, Object>> ranksList = v.getApplicableRanks().stream().map(r -> {
                    Map<String, Object> rMap = new HashMap<>();
                    rMap.put("id", r.getId());
                    rMap.put("rankName", r.getRankName());
                    rMap.put("colorCode", r.getColorCode());
                    return rMap;
                }).collect(Collectors.toList());
                map.put("ranks", ranksList);

                return map;
            }).collect(Collectors.toList());

            var ranks = rankRepo.findAll();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "vouchers", vouchersMap,
                    "ranks", ranks
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy toàn bộ voucher: " + e.getMessage()));
        }
    }

    // 4. LƯU HOẶC CẬP NHẬT VOUCHER DÀNH CHO ADMIN (Bắt buộc % và Tối đa 50%)
    @PostMapping("/admin/save")
    @Transactional
    public ResponseEntity<?> saveVoucherAdmin(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = (Integer) payload.get("id");
            String code = (String) payload.get("code");
            Double discountValue = payload.get("discountValue") != null ? Double.valueOf(payload.get("discountValue").toString()) : null;
            Double maxDiscount = payload.get("maxDiscount") != null ? Double.valueOf(payload.get("maxDiscount").toString()) : null;
            Double minOrderValue = payload.get("minOrderValue") != null ? Double.valueOf(payload.get("minOrderValue").toString()) : null;
            Integer quantity = (Integer) payload.get("quantity");
            Integer status = (Integer) payload.get("status");
            Integer userUsageLimit = (Integer) payload.get("userUsageLimit");
            String startDateStr = (String) payload.get("startDate");
            String endDateStr = (String) payload.get("endDate");
            @SuppressWarnings("unchecked")
            List<Integer> rankIds = (List<Integer>) payload.get("rankIds");

            if (code == null || code.trim().isEmpty() || discountValue == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu thông tin bắt buộc (mã voucher, giá trị % giảm)!"));
            }

            if (discountValue <= 0 || discountValue > 50.0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Loại giảm giá chỉ cho phép giảm theo % và mức giảm tối đa chỉ được 50%!"));
            }

            String cleanCode = code.trim().toUpperCase();

            // Check if voucher code already exists on ANOTHER voucher (prevents SQL UNIQUE KEY constraint error)
            Optional<Voucher> existingCodeOpt = voucherService.getVoucherByCode(cleanCode);
            if (existingCodeOpt.isPresent()) {
                Voucher existingVoucher = existingCodeOpt.get();
                if (id == null || !existingVoucher.getId().equals(id)) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Mã giảm giá '" + cleanCode + "' đã tồn tại trong hệ thống. Vui lòng đặt mã giảm giá khác!"
                    ));
                }
            }

            Voucher voucher;
            if (id != null) {
                voucher = voucherService.getVoucherById(id).orElse(new Voucher());
            } else {
                voucher = new Voucher();
            }

            voucher.setCode(cleanCode);
            voucher.setDiscountType("PERCENT"); // Bắt buộc lưu PERCENT
            voucher.setDiscountValue(discountValue);
            voucher.setMaxDiscount(maxDiscount);
            voucher.setMinOrderValue(minOrderValue);
            voucher.setQuantity(quantity != null ? quantity : 0);
            voucher.setStatus(status != null ? status : 1);
            voucher.setUserUsageLimit(userUsageLimit != null ? userUsageLimit : 1);

            if (startDateStr != null && !startDateStr.trim().isEmpty()) {
                voucher.setStartDate(java.time.LocalDateTime.parse(startDateStr));
            } else {
                voucher.setStartDate(null);
            }
            if (endDateStr != null && !endDateStr.trim().isEmpty()) {
                voucher.setEndDate(java.time.LocalDateTime.parse(endDateStr));
            } else {
                voucher.setEndDate(null);
            }

            if (rankIds != null) {
                java.util.Set<com.ShoeStore.model.MembershipRank> ranks = new java.util.HashSet<>(rankRepo.findAllById(rankIds));
                voucher.setApplicableRanks(ranks);
            } else {
                voucher.setApplicableRanks(new java.util.HashSet<>());
            }

            voucherService.saveVoucher(voucher);
            return ResponseEntity.ok(Map.of("success", true, "message", "Lưu Voucher thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu voucher: " + e.getMessage()));
        }
    }

    // 5. XÓA VOUCHER DÀNH CHO ADMIN
    @DeleteMapping("/admin/{id}")
    @Transactional
    public ResponseEntity<?> deleteVoucherAdmin(@PathVariable Integer id) {
        try {
            voucherService.deleteVoucher(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa Voucher thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xóa voucher: " + e.getMessage()));
        }
    }
}
