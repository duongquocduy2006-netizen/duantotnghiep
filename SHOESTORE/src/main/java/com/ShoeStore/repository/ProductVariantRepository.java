package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ShoeStore.model.ProductVariant;

import java.util.Optional;
import com.ShoeStore.model.Product;
import com.ShoeStore.model.Size;
import com.ShoeStore.model.Color;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {
    Optional<ProductVariant> findByProductAndSizeAndColor(Product product, Size size, Color color);
    java.util.List<ProductVariant> findAllByColor(Color color);
    java.util.List<ProductVariant> findAllBySize(Size size);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM order_items WHERE product_variant_id = ?1", nativeQuery = true)
    long countOrderItemsByVariantId(Integer variantId);

    // Đếm số order_items thuộc đơn hàng chưa bị hủy (status != 4 — chỉ cho xóa biến thể khi đơn đã hủy)
    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM order_items oi " +
            "JOIN orders o ON oi.order_id = o.id " +
            "WHERE oi.product_variant_id = ?1 AND o.status <> 4", nativeQuery = true)
    long countActiveOrderItemsByVariantId(Integer variantId);

    @org.springframework.data.jpa.repository.Modifying
    @jakarta.transaction.Transactional
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM cart_items WHERE product_variant_id = ?1", nativeQuery = true)
    void deleteRelatedCartItems(Integer variantId);

    @org.springframework.data.jpa.repository.Modifying
    @jakarta.transaction.Transactional
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM order_items WHERE product_variant_id = ?1", nativeQuery = true)
    void deleteRelatedOrderItems(Integer variantId);
}
