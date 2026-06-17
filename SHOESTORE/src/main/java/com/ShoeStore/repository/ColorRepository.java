package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ShoeStore.model.Color;

@Repository
public interface ColorRepository extends JpaRepository<Color, Integer> {
    boolean existsByColorName(String colorName);
    java.util.Optional<Color> findByColorName(String colorName);
    java.util.List<Color> findAllByColorName(String colorName);
}
