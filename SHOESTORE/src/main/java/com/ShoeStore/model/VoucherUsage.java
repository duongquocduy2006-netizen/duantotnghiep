package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "voucher_usages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoucherUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "voucher_id", nullable = false)
    private Integer voucherId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;
}
