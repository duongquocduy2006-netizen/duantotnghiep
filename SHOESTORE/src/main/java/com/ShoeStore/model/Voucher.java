package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "vouchers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(name = "discount_type")
    private String discountType; // 'PERCENT' or 'FIXED'

    @Column(name = "discount_value")
    private Double discountValue;

    @Column(name = "min_order_value")
    private Double minOrderValue;

    @Column(name = "max_discount")
    private Double maxDiscount;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    private Integer quantity;

    @Column(name = "user_usage_limit")
    private Integer userUsageLimit; // null or 0 means unlimited

    private Integer status; // 1: Active, 0: Disabled

    @ManyToMany
    @JoinTable(name = "voucher_membership_ranks", joinColumns = @JoinColumn(name = "voucher_id"), inverseJoinColumns = @JoinColumn(name = "rank_id"))
    private Set<MembershipRank> applicableRanks;
}
