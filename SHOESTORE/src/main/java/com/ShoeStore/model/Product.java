package com.ShoeStore.model;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "product_code", unique = true)
    private String productCode;

    @Column(name = "product_name")
    private String productName;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "brand_name")
    private String brandName;

    private Integer status;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Quan hệ với Danh mục
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    @EqualsAndHashCode.Exclude // KHÔNG tính cái này vào hashCode
    @ToString.Exclude // KHÔNG in cái này ra để tránh treo máy
    private Set<ProductVariant> variants;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<ProductImage> images;

    public int getTotalStock() {
        if (variants == null)
            return 0;
        return variants.stream().mapToInt(v -> v.getQuantity() != null ? v.getQuantity() : 0).sum();
    }
}