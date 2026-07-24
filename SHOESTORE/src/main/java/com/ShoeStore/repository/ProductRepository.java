package com.ShoeStore.repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import com.ShoeStore.model.Product;
import jakarta.transaction.Transactional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

        @EntityGraph(attributePaths = { "category", "variants", "images" })
        List<Product> findAll();

        @EntityGraph(attributePaths = { "category", "variants", "images" })
        java.util.Optional<Product> findById(Integer id);

        @Query("SELECT COUNT(p) > 0 FROM Product p WHERE p.category.id = ?1")
        boolean existsByCategoryId(Integer categoryId);

        @Query("SELECT COUNT(p) > 0 FROM Product p WHERE p.brandName = ?1")
        boolean existsByBrandName(String brandName);

        // 1. Xóa trong Giỏ hàng
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM cart_items WHERE product_variant_id IN (SELECT id FROM product_variants WHERE product_id = ?1)", nativeQuery = true)
        void deleteRelatedCartItems(Integer productId);

        // 2. Xóa trong Chi tiết đơn hàng
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM order_items WHERE product_variant_id IN (SELECT id FROM product_variants WHERE product_id = ?1)", nativeQuery = true)
        void deleteRelatedOrderItems(Integer productId);

        // 3. Xóa Ảnh sản phẩm
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM product_images WHERE product_id = ?1", nativeQuery = true)
        void deleteRelatedImages(Integer productId);

        // 4. Xóa Biến thể sản phẩm
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM product_variants WHERE product_id = ?1", nativeQuery = true)
        void deleteRelatedVariants(Integer productId);

        @Modifying
        @Transactional
        @Query(value = "DELETE FROM product_reviews WHERE product_id = ?1", nativeQuery = true)
        void deleteRelatedReviews(Integer productId);

        // 5. Xóa Yêu thích
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM favourites WHERE product_id = ?1", nativeQuery = true)
        void deleteRelatedFavourites(Integer productId);

        // 6. Xóa Flash Sale (Mới bổ sung để fix lỗi)
        @Modifying
        @Transactional
        @Query(value = "DELETE FROM flash_sale_products WHERE product_id = ?1", nativeQuery = true)
        void deleteRelatedFlashSaleProducts(Integer productId);

        // Đếm số order_items thuộc đơn hàng đang xử lý (status NOT IN (3, 4) — chỉ cho xóa sản phẩm khi đơn đã hoàn tất hoặc đã hủy)
        @Query(value = "SELECT COUNT(*) FROM order_items oi " +
                        "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                        "JOIN orders o ON oi.order_id = o.id " +
                        "WHERE pv.product_id = ?1 AND o.status NOT IN (3, 4)", nativeQuery = true)
        long countActiveOrderItemsByProductId(Integer productId);

        @Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.variants v " +
                        "WHERE (:brand = '' OR LOWER(p.brandName) LIKE LOWER(CONCAT('%', :brand, '%'))) " +
                        "AND (:category = '' OR LOWER(p.category.name) LIKE LOWER(CONCAT('%', :category, '%'))) " +
                        "AND (:color = '' OR LOWER(v.color.colorName) LIKE LOWER(CONCAT('%', :color, '%')))")
        List<Product> searchSimilarProducts(@org.springframework.data.repository.query.Param("brand") String brand,
                        @org.springframework.data.repository.query.Param("category") String category,
                        @org.springframework.data.repository.query.Param("color") String color,
                        org.springframework.data.domain.Pageable pageable);

}