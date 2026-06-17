package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "brands")
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "brand_name", columnDefinition = "nvarchar(100)")
    private String name;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "status")
    private boolean active = true;
}
