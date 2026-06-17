package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Entity
@Table(name = "flash_sale_products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FlashSaleProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "flash_sale_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private FlashSale flashSale;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne
    @JoinColumn(name = "variant_id", nullable = true)
    private ProductVariant productVariant;

    @NotNull(message = "Giá sale không được để trống")
    @Min(value = 0, message = "Giá sale không được nhỏ hơn 0")
    @Column(name = "sale_price", nullable = false)
    private BigDecimal salePrice;

    @NotNull(message = "Giới hạn số lượng không được để trống")
    @Min(value = 1, message = "Giới hạn số lượng phải ít nhất là 1")
    @Column(name = "quantity_limit", nullable = false)
    private Integer quantityLimit;

    @Column(name = "sold_quantity", nullable = false)
    private Integer soldQuantity = 0;
}
