package com.ShoeStore.service;

import com.ShoeStore.model.Voucher;
import com.ShoeStore.repository.VoucherRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;

@Service
public class VoucherService {

    @Autowired
    private VoucherRepository voucherRepo;

    @Autowired
    private JdbcTemplate jdbc;

    public List<Voucher> getAllVouchers() {
        return voucherRepo.findAllWithRanks();
    }

    public Optional<Voucher> getVoucherById(Integer id) {
        return voucherRepo.findById(id);
    }

    public Voucher saveVoucher(Voucher voucher) {
        return voucherRepo.save(voucher);
    }

    public void deleteVoucher(Integer id) {
        voucherRepo.deleteById(id);
    }

    public static class VoucherValidationResult {
        private boolean valid;
        private String message;
        private Voucher voucher;

        public VoucherValidationResult(boolean valid, String message, Voucher voucher) {
            this.valid = valid;
            this.message = message;
            this.voucher = voucher;
        }

        public boolean isValid() { return valid; }
        public String getMessage() { return message; }
        public Voucher getVoucher() { return voucher; }
    }

    @Transactional
    public VoucherValidationResult validateVoucherDetailed(String code, Integer userRankId, Double orderTotal, Long userId) {
        Optional<Voucher> voucherOpt = voucherRepo.findByCode(code);

        if (voucherOpt.isEmpty()) {
            return new VoucherValidationResult(false, "Mã giảm giá '" + code + "' không tồn tại trong hệ thống!", null);
        }

        Voucher v = voucherOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // 1. Kiểm tra trạng thái
        if (v.getStatus() != null && v.getStatus() == 0) {
            return new VoucherValidationResult(false, "Mã giảm giá '" + code + "' đã bị tạm dừng hoạt động!", null);
        }

        // 2. Kiểm tra thời hạn (buffer 5 phút cho mã vừa khởi tạo)
        if (v.getStartDate() != null && now.plusMinutes(5).isBefore(v.getStartDate())) {
            return new VoucherValidationResult(false, "Mã giảm giá '" + code + "' chưa đến thời gian bắt đầu áp dụng!", null);
        }
        if (v.getEndDate() != null && now.isAfter(v.getEndDate())) {
            return new VoucherValidationResult(false, "Mã giảm giá '" + code + "' đã hết hạn sử dụng!", null);
        }

        // 3. Kiểm tra số lượng phát hành
        if (v.getQuantity() != null && v.getQuantity() <= 0) {
            return new VoucherValidationResult(false, "Mã giảm giá '" + code + "' đã hết lượt sử dụng!", null);
        }

        // 4. Kiểm tra giá trị đơn hàng tối thiểu
        if (v.getMinOrderValue() != null && orderTotal < v.getMinOrderValue()) {
            return new VoucherValidationResult(false, "Giá trị đơn hàng chưa đạt mức tối thiểu " + String.format("%,.0f", v.getMinOrderValue()) + "đ để sử dụng mã này!", null);
        }

        // 5. Kiểm tra Hạng thành viên
        if (v.getApplicableRanks() != null && !v.getApplicableRanks().isEmpty()) {
            Integer effectiveRankId = userRankId;
            if (userId != null) {
                try {
                    Integer totalPoints = jdbc.queryForObject("SELECT points FROM accounts WHERE id = ?", Integer.class, userId);
                    if (totalPoints != null) {
                        List<java.util.Map<String, Object>> ranks = jdbc.queryForList(
                                "SELECT id, min_points FROM membership_ranks ORDER BY min_points DESC");
                        for (java.util.Map<String, Object> r : ranks) {
                            if (totalPoints >= ((Number) r.get("min_points")).intValue()) {
                                effectiveRankId = ((Number) r.get("id")).intValue();
                                break;
                            }
                        }
                    }
                } catch (Exception e) {
                    System.out.println("DEBUG Error fetching rank points: " + e.getMessage());
                }
            }
            final Integer finalRankId = effectiveRankId != null ? effectiveRankId : 1;
            boolean isEligible = v.getApplicableRanks().stream()
                    .anyMatch(rank -> rank.getId().equals(finalRankId));
            if (!isEligible) {
                return new VoucherValidationResult(false, "Tài khoản của bạn chưa đạt hạng thành viên được phép dùng mã này!", null);
            }
        }

        // 6. Kiểm tra giới hạn số lần dùng của từng User
        if (v.getUserUsageLimit() != null && v.getUserUsageLimit() > 0 && userId != null) {
            Integer currentUsage = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM voucher_usages WHERE voucher_id = ? AND user_id = ?",
                    Integer.class, v.getId(), userId);

            if (currentUsage != null && currentUsage >= v.getUserUsageLimit()) {
                return new VoucherValidationResult(false, "Bạn đã sử dụng tối đa " + v.getUserUsageLimit() + " lượt cho phép của mã giảm giá này!", null);
            }
        }

        return new VoucherValidationResult(true, "Mã giảm giá hợp lệ!", v);
    }

    @Transactional
    public Optional<Voucher> validateVoucher(String code, Integer userRankId, Double orderTotal, Long userId) {
        VoucherValidationResult res = validateVoucherDetailed(code, userRankId, orderTotal, userId);
        if (res.isValid()) {
            return Optional.of(res.getVoucher());
        }
        return Optional.empty();
    }

    public Double calculateDiscount(Voucher v, Double orderTotal) {
        return calculateDiscount(v, orderTotal, null);
    }

    public Double calculateDiscount(Voucher v, Double orderTotal, Double eligibleSubtotal) {
        if (v.getDiscountValue() == null)
            return 0.0;

        double baseAmount = (eligibleSubtotal != null && eligibleSubtotal >= 0) ? eligibleSubtotal : orderTotal;

        if ("PERCENT".equalsIgnoreCase(v.getDiscountType()) || v.getDiscountType() == null) {
            double pct = Math.min(v.getDiscountValue(), 50.0); // Tối đa 50%
            Double discount = baseAmount * (pct / 100.0);
            if (v.getMaxDiscount() != null && v.getMaxDiscount() > 0) {
                discount = Math.min(discount, v.getMaxDiscount());
            }
            return discount;
        } else {
            return Math.min(v.getDiscountValue(), baseAmount);
        }
    }
}
