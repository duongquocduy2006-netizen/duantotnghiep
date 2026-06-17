package com.ShoeStore.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "banner_images")
@Data
public class BannerImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "banner_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Banner banner;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "display_order")
    private Integer displayOrder;
}
