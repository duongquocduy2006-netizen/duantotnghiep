package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "sizes")
@Data
public class Size {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "size_name", columnDefinition = "NVARCHAR(255)")
    private String sizeName;
}