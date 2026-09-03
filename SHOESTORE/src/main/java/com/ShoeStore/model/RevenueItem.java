package com.ShoeStore.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RevenueItem {
    private String month;
    private double percentage; // Tỷ lệ % chiều cao của cột trong biểu đồ
    private double value;      // Giá trị tiền thực tế
    private int totalOrders;   // Số đơn hàng thành công thực tế

    public RevenueItem(String month, double percentage, double value) {
        this.month = month;
        this.percentage = percentage;
        this.value = value;
        this.totalOrders = 0;
    }
}