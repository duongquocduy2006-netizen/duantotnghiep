package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ShoeStore.model.Banner;

import java.util.List;

import org.springframework.data.jpa.repository.Query;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Long> {
    
    @Query("SELECT DISTINCT b FROM Banner b LEFT JOIN FETCH b.images WHERE b.status = true")
    List<Banner> findByStatusTrue();

    @Override
    @Query("SELECT DISTINCT b FROM Banner b LEFT JOIN FETCH b.images")
    List<Banner> findAll();

    @Override
    @Query("SELECT DISTINCT b FROM Banner b LEFT JOIN FETCH b.images WHERE b.id = :id")
    java.util.Optional<Banner> findById(@org.springframework.data.repository.query.Param("id") Long id);
}
