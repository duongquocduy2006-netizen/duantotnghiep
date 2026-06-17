package com.ShoeStore.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Activity {
    private String type;     // "success", "warning", "info"
    private String message;  // Nội dung thông báo
    private String timeAgo;  // Thời gian (VD: "2 phút trước")
}