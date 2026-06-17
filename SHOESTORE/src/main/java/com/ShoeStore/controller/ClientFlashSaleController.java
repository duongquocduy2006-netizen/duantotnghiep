package com.ShoeStore.controller;

import com.ShoeStore.model.FlashSale;
import com.ShoeStore.model.FlashSaleProduct;
import com.ShoeStore.service.FlashSaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Controller
public class ClientFlashSaleController {

    @Autowired
    private FlashSaleService flashSaleService;

    @GetMapping("/flash-sale")
    public String flashSale(Model model) {
        Optional<FlashSale> activeFlashSale = flashSaleService.getActiveFlashSale();
        
        if (activeFlashSale.isPresent()) {
            model.addAttribute("flashSale", activeFlashSale.get());
            List<FlashSaleProduct> products = flashSaleService.getProductsByFlashSaleId(activeFlashSale.get().getId());
            model.addAttribute("flashSaleProducts", products);
        } else {
            model.addAttribute("flashSale", null);
            model.addAttribute("flashSaleProducts", Collections.emptyList());
        }
        
        return "client/flash-sale";
    }
}
