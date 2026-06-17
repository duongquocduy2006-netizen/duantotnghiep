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
}