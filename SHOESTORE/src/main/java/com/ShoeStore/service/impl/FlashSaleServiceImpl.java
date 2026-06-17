package com.ShoeStore.service.impl;

import com.ShoeStore.model.FlashSale;
import com.ShoeStore.model.FlashSaleProduct;
import com.ShoeStore.model.Product;
import com.ShoeStore.repository.FlashSaleProductRepository;
import com.ShoeStore.repository.FlashSaleRepository;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.FlashSaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FlashSaleServiceImpl implements FlashSaleService {

    @Autowired
    private FlashSaleRepository flashSaleRepository;

    @Autowired
    private FlashSaleProductRepository flashSaleProductRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    public List<FlashSale> getAllFlashSales() {
        return flashSaleRepository.findAllWithProductsOrdered();
    }

    @Override
    public Optional<FlashSale> getFlashSaleById(Integer id) {
        return flashSaleRepository.findByIdWithProducts(id);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public FlashSale saveFlashSale(FlashSale flashSale) {
        if (flashSale.getId() != null) {
            FlashSale existing = flashSaleRepository.findById(flashSale.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid flash sale Id:" + flashSale.getId()));

            existing.setName(flashSale.getName());
            existing.setStartDate(flashSale.getStartDate());
            existing.setEndDate(flashSale.getEndDate());
            existing.setStatus(flashSale.getStatus());

            // Tránh lỗi "A collection with orphan deletion was no longer referenced"
            // Bằng cách clear list cũ và add all từ list mới, thay vì thay thế nguyên list
            // instance
            existing.getFlashSaleProducts().clear();
            if (flashSale.getFlashSaleProducts() != null) {
                for (FlashSaleProduct fsp : flashSale.getFlashSaleProducts()) {
                    // Cần load Product thật từ DB để lấy được variants/totalStock
                    Product prod = productRepository.findById(fsp.getProduct().getId()).orElse(null);
                    if (prod != null) {
                        fsp.setProduct(prod);
                        int totalStock = prod.getTotalStock();
                        if (fsp.getQuantityLimit() > totalStock) {
                            fsp.setQuantityLimit(totalStock);
                        }
                    }

                    fsp.setFlashSale(existing);
                    existing.getFlashSaleProducts().add(fsp);
                }
            }
            FlashSale saved = flashSaleRepository.save(existing);
            flashSaleRepository.flush(); // Cưỡng ép flush để xóa các orphan ngay lập tức
            return saved;
        }

        // Cần đảm bảo set bidi-relation cho trường hợp tạo mới
        if (flashSale.getFlashSaleProducts() != null) {
            for (FlashSaleProduct fsp : flashSale.getFlashSaleProducts()) {
                Product prod = productRepository.findById(fsp.getProduct().getId()).orElse(null);
                if (prod != null) {
                    fsp.setProduct(prod);
                    int totalStock = prod.getTotalStock();
                    if (fsp.getQuantityLimit() > totalStock) {
                        fsp.setQuantityLimit(totalStock);
                    }
                }
                fsp.setFlashSale(flashSale);
            }
        }

        return flashSaleRepository.save(flashSale);
    }

    @Override
    public void deleteFlashSale(Integer id) {
        flashSaleRepository.deleteById(id);
    }

    @Override
    public Optional<FlashSale> getActiveFlashSale() {
        // Cộng thêm 5 phút đệm để hiển thị sớm hoặc tránh lệch giây giữa Client/Server
        LocalDateTime nowPlusBuffer = LocalDateTime.now().plusMinutes(5);
        List<FlashSale> activeSales = flashSaleRepository.findActiveFlashSales(nowPlusBuffer);
        return activeSales.isEmpty() ? Optional.empty() : Optional.of(activeSales.get(0));
    }

    @Override
    public List<FlashSaleProduct> getProductsByFlashSaleId(Integer flashSaleId) {
        return flashSaleProductRepository.findByFlashSaleIdWithProductAndVariants(flashSaleId);
    }
}
