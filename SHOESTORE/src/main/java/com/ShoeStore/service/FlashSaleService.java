package com.ShoeStore.service;

import com.ShoeStore.model.FlashSale;
import com.ShoeStore.model.FlashSaleProduct;

import java.util.List;
import java.util.Optional;

public interface FlashSaleService {
    List<FlashSale> getAllFlashSales();
    Optional<FlashSale> getFlashSaleById(Integer id);
    FlashSale saveFlashSale(FlashSale flashSale);
    void deleteFlashSale(Integer id);
    
    Optional<FlashSale> getActiveFlashSale();
    List<FlashSaleProduct> getProductsByFlashSaleId(Integer flashSaleId);
}
