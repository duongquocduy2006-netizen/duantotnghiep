package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ShoeStore.model.Category;
import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    @Query("SELECT c FROM Category c WHERE c.name LIKE %:keyword% AND (:active IS NULL OR c.active = :active)")
    List<Category> searchCategories(@Param("keyword") String keyword, @Param("active") Boolean active);
}
