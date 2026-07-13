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
import java.util.Collections;
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
            String brand = aiResult.getBrand().trim();
            String category = aiResult.getCategory().trim();
            String color = aiResult.getColor().trim();

            model.addAttribute("aiResult", aiResult);

            if (brand.isEmpty()) {
                model.addAttribute("error", "Không thể xác định thương hiệu từ ảnh.");
                return "image-search";
            }

            List<Product> products = Collections.emptyList();
            if (!brand.isEmpty() && !category.isEmpty() && !color.isEmpty()) {
                products = productRepository.searchByBrandCategoryColor(brand, category, color, Pageable.unpaged());
            }

            if (products.isEmpty() && !brand.isEmpty() && !category.isEmpty()) {
                products = productRepository.searchByBrandCategory(brand, category, Pageable.unpaged());
            }

            if (products.isEmpty() && !brand.isEmpty() && !color.isEmpty()) {
                products = productRepository.searchByBrandColor(brand, color, Pageable.unpaged());
            }

            if (products.isEmpty()) {
                products = productRepository.searchByBrand(brand, Pageable.unpaged());
            }

            // Bắt buộc map dữ liệu collection để tránh lỗi LazyInitializationException
            for (Product p : products) {
                if (p.getVariants() != null)
                    p.getVariants().size();
                if (p.getImages() != null)
                    p.getImages().size();
            }

            if (products.isEmpty()) {
                model.addAttribute("info", "Không tìm thấy sản phẩm phù hợp.");
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
// rebuild
