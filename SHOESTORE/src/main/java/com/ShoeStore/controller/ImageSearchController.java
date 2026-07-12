package com.ShoeStore.controller;

import com.ShoeStore.model.ImageSearchResult;
import com.ShoeStore.model.Product;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.ImageSearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;

@Controller
@RequestMapping("/search")
public class ImageSearchController {

    @Autowired
    private ImageSearchService imageSearchService;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/image")
    public String showSearchPage() {
        return "image-search";
    }

    @Transactional(readOnly = true)
    @PostMapping("/image")
    public String searchByImage(@RequestParam("file") MultipartFile file, Model model) {
        try {
            String base64Img = Base64.getEncoder().encodeToString(file.getBytes());
            model.addAttribute("uploadedImage", "data:" + file.getContentType() + ";base64," + base64Img);

            ImageSearchResult aiResult = imageSearchService.analyzeImage(file);
            String brand = aiResult.getBrand();
            String category = aiResult.getCategory();
            String color = aiResult.getColor();

            model.addAttribute("aiResult", aiResult);

                    
            List<Product> products = productRepository.searchSimilarProducts(brand, category, color, Pageable.unpaged());

            // Bắt buộc map dữ liệu collection để tránh lỗi LazyInitializationException
            for (Product p : products) {
                if (p.getVariants() != null)
                    p.getVariants().size();
                if (p.getImages() != null)
                    p.getImages().size();
            }

            if (products.isEmpty()) {
                model.addAttribute("info",
                        "Hiện tại cửa hàng chưa có sản phẩm của thương hiệu này.");
            } else {
                model.addAttribute("products", products);
            }

        } catch (Exception e) {
            e.printStackTrace();
            model.addAttribute("error", "Lỗi xử lý kết quả thông qua AI: " + e.getMessage());
        }

        return "image-search";
    }
}
