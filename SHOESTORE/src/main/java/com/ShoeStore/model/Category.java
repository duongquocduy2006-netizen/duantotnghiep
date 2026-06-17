package com.ShoeStore.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "categories")
public class Category {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "category_name", columnDefinition = "nvarchar(100)")
    private String name;
    
    // Dùng category_code trong DB để lưu slug của link web
    @Column(name = "category_code", length = 255, unique = true, columnDefinition = "varchar(255)")
    private String slug;
    
    // JPA tự động chuyển đổi status (INT trong DB: 1 hoặc 0) sang boolean
    @Column(name = "status")
    private boolean active;
}