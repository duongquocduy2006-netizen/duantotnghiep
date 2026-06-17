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

    @org.springframework.data.jpa.repository.Modifying
    @jakarta.transaction.Transactional
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM cart_items WHERE product_variant_id = ?1", nativeQuery = true)
    void deleteRelatedCartItems(Integer variantId);

    @org.springframework.data.jpa.repository.Modifying
    @jakarta.transaction.Transactional
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM order_items WHERE product_variant_id = ?1", nativeQuery = true)
    void deleteRelatedOrderItems(Integer variantId);
}
