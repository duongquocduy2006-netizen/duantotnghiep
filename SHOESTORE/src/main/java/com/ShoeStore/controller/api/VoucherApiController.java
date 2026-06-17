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

    // 1. LẤY DANH SÁCH VOUCHER KHẢ DỤNG CHO USER KHI ĐẶT HÀNG
    @GetMapping
    public ResponseEntity<?> getAvailableVouchers(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        
        int rankId = 1; // Mặc định là hạng Đồng/Mới (id = 1)
        if (account != null) {
            Long accountId = ((Number) account.get("id")).longValue();
            Integer dbRankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            if (dbRankId != null) {
                rankId = dbRankId;
            }
        }

        // Lấy tất cả Voucher hoạt động và phù hợp với thứ hạng thành viên
        String sql = "SELECT DISTINCT v.id, v.code, v.discount_value, v.discount_type, v.max_discount, " +
                "v.min_order_value, v.start_date, v.end_date, v.quantity " +
                "FROM vouchers v " +
                "LEFT JOIN voucher_membership_ranks vmr ON v.id = vmr.voucher_id " +
                "WHERE v.status = 1 AND v.quantity > 0 " +
                "AND (v.start_date IS NULL OR GETDATE() >= v.start_date) " +
                "AND (v.end_date IS NULL OR GETDATE() <= v.end_date) " +
                "AND (vmr.rank_id IS NULL OR vmr.rank_id = ?)";

        try {
            List<Map<String, Object>> vouchers = jdbc.queryForList(sql, rankId);
            return ResponseEntity.ok(Map.of("success", true, "vouchers", vouchers));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy danh sách voucher: " + e.getMessage()));
        }
    }

    // 2. ÁP DỤNG VOUCHER CHO ĐƠN HÀNG
    @PostMapping("/apply")
    public ResponseEntity<?> applyVoucher(@RequestBody Map<String, Object> payload, HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Bạn chưa đăng nhập!"));
        }

        String code = (String) payload.get("voucherCode");
        Double cartTotal = null;
        if (payload.containsKey("cartTotal")) {
            cartTotal = ((Number) payload.get("cartTotal")).doubleValue();
        }

        if (code == null || code.trim().isEmpty() || cartTotal == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu voucherCode hoặc cartTotal!"));
        }

        Long accountId = ((Number) account.get("id")).longValue();

        try {
            Integer rankId = jdbc.queryForObject("SELECT membership_rank_id FROM accounts WHERE id = ?", Integer.class, accountId);
            Optional<Voucher> voucherOpt = voucherService.validateVoucher(code, rankId, cartTotal, accountId);

            if (voucherOpt.isPresent()) {
                Voucher voucher = voucherOpt.get();
                double discount = voucherService.calculateDiscount(voucher, cartTotal);
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "code", voucher.getCode(),
                        "discount", discount,
                        "voucher", voucher,
                        "message", "Áp dụng mã giảm giá thành công!"
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Mã giảm giá không hợp lệ, hết hạn hoặc không đủ điều kiện!"
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
                map.put("discountType", v.getDiscountType());
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

    // 4. LƯU HOẶC CẬP NHẬT VOUCHER DÀNH CHO ADMIN
    @PostMapping("/admin/save")
    @Transactional
    public ResponseEntity<?> saveVoucherAdmin(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = (Integer) payload.get("id");
            String code = (String) payload.get("code");
            Double discountValue = payload.get("discountValue") != null ? Double.valueOf(payload.get("discountValue").toString()) : null;
            String discountType = (String) payload.get("discountType");
            Double maxDiscount = payload.get("maxDiscount") != null ? Double.valueOf(payload.get("maxDiscount").toString()) : null;
            Double minOrderValue = payload.get("minOrderValue") != null ? Double.valueOf(payload.get("minOrderValue").toString()) : null;
            Integer quantity = (Integer) payload.get("quantity");
            Integer status = (Integer) payload.get("status");
            Integer userUsageLimit = (Integer) payload.get("userUsageLimit");
            String startDateStr = (String) payload.get("startDate");
            String endDateStr = (String) payload.get("endDate");
            @SuppressWarnings("unchecked")
            List<Integer> rankIds = (List<Integer>) payload.get("rankIds");

            if (code == null || code.trim().isEmpty() || discountType == null || discountValue == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu thông tin bắt buộc (code, loại, giá trị)!"));
            }

            Voucher voucher;
            if (id != null) {
                voucher = voucherService.getVoucherById(id).orElse(new Voucher());
            } else {
                voucher = new Voucher();
            }

            voucher.setCode(code.trim().toUpperCase());
            voucher.setDiscountType(discountType);
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
