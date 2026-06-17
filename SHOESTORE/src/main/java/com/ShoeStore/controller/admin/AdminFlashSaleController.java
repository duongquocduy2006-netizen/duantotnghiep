package com.ShoeStore.controller.admin;

import com.ShoeStore.model.FlashSale;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.FlashSaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.validation.BindingResult;

import org.springframework.web.bind.WebDataBinder;

@Controller
@RequestMapping("/admin/flashsales")
public class AdminFlashSaleController {

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.setAutoGrowCollectionLimit(256);
    }

    @Autowired
    private FlashSaleService flashSaleService;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public String index(Model model) {
        model.addAttribute("flashSales", flashSaleService.getAllFlashSales());
        return "admin/flashsales/index";
    }

    @GetMapping("/create")
    public String createForm(Model model) {
        model.addAttribute("flashSale", new FlashSale());
        model.addAttribute("products", productRepository.findAll());
        return "admin/flashsales/form";
    }

    @GetMapping("/edit/{id}")
    public String editForm(@PathVariable Integer id, Model model) {
        FlashSale flashSale = flashSaleService.getFlashSaleById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid flash sale Id:" + id));
        model.addAttribute("flashSale", flashSale);
        model.addAttribute("products", productRepository.findAll());
        return "admin/flashsales/form";
    }

    @PostMapping("/save")
    public String save(@Valid @ModelAttribute("flashSale") FlashSale flashSale, BindingResult result, Model model) {
        if (result.hasErrors()) {
            model.addAttribute("products", productRepository.findAll());
            return "admin/flashsales/form";
        }
        
        // Ensure bidirectional relationship is set for FlashSaleProducts
        if (flashSale.getFlashSaleProducts() != null) {
            flashSale.getFlashSaleProducts().forEach(fsp -> fsp.setFlashSale(flashSale));
        }

        flashSaleService.saveFlashSale(flashSale);
        return "redirect:/admin/flashsales";
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Integer id) {
        flashSaleService.deleteFlashSale(id);
        return "redirect:/admin/flashsales";
    }
}
