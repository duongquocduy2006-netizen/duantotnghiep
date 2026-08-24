package com.ShoeStore.repository;

import com.ShoeStore.model.FlashSaleProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FlashSaleProductRepository extends JpaRepository<FlashSaleProduct, Integer> {
    
    @Query("SELECT DISTINCT fsp FROM FlashSaleProduct fsp " +
           "JOIN FETCH fsp.product p " +
           "LEFT JOIN FETCH p.variants v " +
           "LEFT JOIN FETCH p.images " +
           "WHERE fsp.flashSale.id = :flashSaleId " +
           "AND p.status = 1 " + // Chỉ lấy sản phẩm đang hoạt động
           "AND (fsp.quantityLimit = 0 OR fsp.quantityLimit IS NULL OR fsp.soldQuantity < fsp.quantityLimit) " + // Chưa bán hết suất Flash Sale (0 = Không giới hạn)
           "AND EXISTS (SELECT pv FROM ProductVariant pv WHERE pv.product = p AND pv.quantity > 0 AND pv.status = 1)") // Còn hàng trong kho
    List<FlashSaleProduct> findByFlashSaleIdWithProductAndVariants(@Param("flashSaleId") Integer flashSaleId);

    List<FlashSaleProduct> findByFlashSaleId(Integer flashSaleId);
}
