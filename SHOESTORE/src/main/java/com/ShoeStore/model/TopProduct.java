package com.ShoeStore.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TopProduct {
    private Integer id;
    private String name;
    private String sku;            // Mã sản phẩm (SKU)
    private String category;
    private int soldCount;         // Số lượng đã bán
    private double totalRevenue;   // Tổng doanh thu (kiểu số để format tiền)
    private String image;          // Link hình ảnh
}