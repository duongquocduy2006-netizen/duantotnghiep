package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.ShoeStore.model.Brand;
import java.util.List;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Integer> {
    @Query("SELECT b FROM Brand b WHERE b.name LIKE %:keyword% AND (:active IS NULL OR b.active = :active)")
    List<Brand> searchBrands(@Param("keyword") String keyword, @Param("active") Boolean active);
}
