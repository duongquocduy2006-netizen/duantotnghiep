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

            existing.getFlashSaleProducts().clear();
            flashSaleRepository.flush();

            if (flashSale.getFlashSaleProducts() != null) {
                for (FlashSaleProduct fsp : flashSale.getFlashSaleProducts()) {
                    fsp.setId(null);
                    Product prod = productRepository.findById(fsp.getProduct().getId()).orElse(null);
                    if (prod != null) {
                        fsp.setProduct(prod);
                        int totalStock = prod.getTotalStock();
                        if (fsp.getQuantityLimit() != null && fsp.getQuantityLimit() > 0 && fsp.getQuantityLimit() > totalStock) {
                            fsp.setQuantityLimit(totalStock);
                        }
                    }

                    fsp.setFlashSale(existing);
                    existing.getFlashSaleProducts().add(fsp);
                }
            }
            return flashSaleRepository.save(existing);
        }

        if (flashSale.getFlashSaleProducts() != null) {
            for (FlashSaleProduct fsp : flashSale.getFlashSaleProducts()) {
                fsp.setId(null);
                Product prod = productRepository.findById(fsp.getProduct().getId()).orElse(null);
                if (prod != null) {
                    fsp.setProduct(prod);
                    int totalStock = prod.getTotalStock();
                    if (fsp.getQuantityLimit() != null && fsp.getQuantityLimit() > 0 && fsp.getQuantityLimit() > totalStock) {
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
        LocalDateTime now = LocalDateTime.now();
        List<FlashSale> activeSales = flashSaleRepository.findActiveOrUpcomingFlashSales(now);
        return activeSales.isEmpty() ? Optional.empty() : Optional.of(activeSales.get(0));
    }

    @Override
    public List<FlashSaleProduct> getProductsByFlashSaleId(Integer flashSaleId) {
        return flashSaleProductRepository.findByFlashSaleIdWithProductAndVariants(flashSaleId);
    }
}
