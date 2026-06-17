package com.ShoeStore.repository;

import com.ShoeStore.model.FlashSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlashSaleRepository extends JpaRepository<FlashSale, Integer> {

    @Query("SELECT f FROM FlashSale f LEFT JOIN FETCH f.flashSaleProducts WHERE f.id = :id")
    Optional<FlashSale> findByIdWithProducts(@Param("id") Integer id);

    @Query("SELECT f FROM FlashSale f WHERE f.status = 1 AND :now BETWEEN f.startDate AND f.endDate ORDER BY f.startDate DESC")
    List<FlashSale> findActiveFlashSales(@Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT f FROM FlashSale f LEFT JOIN FETCH f.flashSaleProducts ORDER BY f.startDate DESC")
    List<FlashSale> findAllWithProductsOrdered();

    List<FlashSale> findAllByOrderByStartDateDesc();
}
