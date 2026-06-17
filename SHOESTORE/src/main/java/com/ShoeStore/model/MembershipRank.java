package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "membership_ranks")
public class MembershipRank {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "rank_name", columnDefinition = "nvarchar(50)")
    private String rankName;

    @Column(name = "min_points")
    private Integer minPoints;

    @Column(name = "color_code", length = 20)
    private String colorCode; // Hex color code, e.g., #FFD700

    @Column(name = "discount_percent")
    private Double discountPercent;

    @Column(name = "description", columnDefinition = "nvarchar(255)")
    private String description;

    @Column(name = "status")
    private Integer status;

    @Column(name = "free_shipping")
    private Boolean freeShipping = false;
}
