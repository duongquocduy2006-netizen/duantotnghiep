package com.ShoeStore.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomerDTO {
    private Integer id;
    private String fullName;
    private String email;
    private String phone;
    private String rankName;
    private String rankColor;
    private double totalSpent;
    private Integer rankId;
    private int status;
    private String role;

    // Hàm tự động tạo chữ viết tắt cho Avatar từ tên đầy đủ
    public String getInitials() {
        if (fullName == null || fullName.trim().isEmpty())
            return "U";
        String[] words = fullName.trim().split("\\s+");
        if (words.length == 1) {
            return words[0].substring(0, Math.min(2, words[0].length())).toUpperCase();
        }
        String first = words[words.length - 2].substring(0, 1);
        String second = words[words.length - 1].substring(0, 1);
        return (first + second).toUpperCase();
    }
}