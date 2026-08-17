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

    @Transactional
    public Optional<Voucher> validateVoucher(String code, Integer userRankId, Double orderTotal, Long userId) {
        Optional<Voucher> voucherOpt = voucherRepo.findByCode(code);

        if (voucherOpt.isEmpty())
            return Optional.empty();

        Voucher v = voucherOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // 1. Kiểm tra trạng thái (Mặc định null hoặc 1 là Active)
        if (v.getStatus() != null && v.getStatus() == 0) {
            System.out.println("DEBUG Voucher " + code + ": Disabled (status=0)");
            return Optional.empty();
        }

        // 2. Kiểm tra thời hạn
        if (v.getStartDate() != null && now.isBefore(v.getStartDate())) {
            System.out
                    .println("DEBUG Voucher " + code + ": Too early. Current: " + now + ", Start: " + v.getStartDate());
            return Optional.empty();
        }
        if (v.getEndDate() != null && now.isAfter(v.getEndDate())) {
            System.out.println("DEBUG Voucher " + code + ": Expired. Current: " + now + ", End: " + v.getEndDate());
            return Optional.empty();
        }

        // 3. Kiểm tra số lượng
        if (v.getQuantity() != null && v.getQuantity() <= 0) {
            System.out.println("DEBUG Voucher " + code + ": Out of quantity (" + v.getQuantity() + ")");
            return Optional.empty();
        }

        // 4. Kiểm tra giá trị đơn hàng tối thiểu
        if (v.getMinOrderValue() != null && orderTotal < v.getMinOrderValue()) {
            System.out.println("DEBUG Voucher " + code + ": Total " + orderTotal + " < Min " + v.getMinOrderValue());
            return Optional.empty();
        }

        // 5. Kiểm tra Hạng thành viên (QUAN TRỌNG)
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
                        if (effectiveRankId != null && !effectiveRankId.equals(userRankId)) {
                            jdbc.update("UPDATE accounts SET membership_rank_id = ? WHERE id = ?", effectiveRankId, userId);
                        }
                    }
                } catch (Exception e) {
                    System.out.println("DEBUG Error fetching effective rank from points: " + e.getMessage());
                }
            }
            final Integer finalRankId = effectiveRankId != null ? effectiveRankId : 1;
            System.out.println("DEBUG Voucher: " + v.getCode() + " requires ranks: " +
                    v.getApplicableRanks().stream().map(r -> r.getId().toString()).reduce((a, b) -> a + "," + b)
                            .orElse("none"));
            System.out.println("DEBUG User Effective Rank: " + finalRankId);

            boolean isEligible = v.getApplicableRanks().stream()
                    .anyMatch(rank -> rank.getId().equals(finalRankId));
            if (!isEligible) {
                System.out.println("DEBUG Result: Ineligible Rank");
                return Optional.empty();
            }
        }

        // 6. Kiểm tra User sử dụng bao nhiêu lần (nếu có giới hạn)
        if (v.getUserUsageLimit() != null && v.getUserUsageLimit() > 0 && userId != null) {
            System.out.println("DEBUG Voucher " + code + ": requires max usage per user = " + v.getUserUsageLimit());
            Integer currentUsage = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM voucher_usages WHERE voucher_id = ? AND user_id = ?",
                    Integer.class, v.getId(), userId);

            if (currentUsage != null && currentUsage >= v.getUserUsageLimit()) {
                System.out.println(
                        "DEBUG Result: User reached max usage (" + currentUsage + "/" + v.getUserUsageLimit() + ")");
                return Optional.empty();
            }
        }

        System.out.println("DEBUG Result: Validated successfully");
        return Optional.of(v);
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
