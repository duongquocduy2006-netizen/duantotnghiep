package com.ShoeStore.repository;

import com.ShoeStore.model.BannerImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BannerImageRepository extends JpaRepository<BannerImage, Long> {
}
