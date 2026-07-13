package com.ShoeStore.controller;

import com.ShoeStore.model.ImageSearchResult;
import com.ShoeStore.model.Product;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.ImageSearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/ai")
public class ImageSearchRestController {

    @Autowired
    private ImageSearchService imageSearchService;

    @Autowired
    private ProductRepository productRepository;

    @Transactional(readOnly = true)
    @PostMapping("/image-search")
    public ResponseEntity<?> searchByImage(@RequestParam("file") MultipartFile file) {
        try {
            ImageSearchResult aiResult = imageSearchService.analyzeImage(file);

            String brand = aiResult.getBrand();
            String category = aiResult.getCategory();
            String color = aiResult.getColor();

            System.out.println("============== [AI SEARCH DEBUG] ==============");
            System.out.println("Brand AI nhận diện: " + brand);
            System.out.println("Category AI nhận diện: " + category);
            System.out.println("Color AI nhận diện: " + color);
            System.out.println("===============================================");

            if (brand.isEmpty() && category.isEmpty() && color.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message",
                        "AI không thể nhận diện được thông tin (Hãng, Loại, Màu). Vui lòng thử ảnh giày rõ hơn."));
            }

            List<Product> products = productRepository.searchSimilarProducts(brand, category, color,
                    Pageable.unpaged());

            // FALLBACK 1: Rút bớt điều kiện 'color' nếu quá gắt gao
            if (products.isEmpty() && !color.isEmpty()) {
                System.out.println("Không tìm thấy khớp 3 tiêu chí, thử giãn điều kiện: Bỏ màu sắc...");
                products = productRepository.searchSimilarProducts(brand, category, "", Pageable.unpaged());
            }

            // FALLBACK 2: Rút bớt điều kiện 'category' chỉ tìm theo brand
            if (products.isEmpty() && !category.isEmpty()) {
                System.out.println("Không tìm thấy khớp 2 tiêu chí, thử giãn điều kiện: Tìm duy nhất theo hãng...");
                products = productRepository.searchSimilarProducts(brand, "", "", Pageable.unpaged());
            }

            System.out.println("Số lượng products trả về từ Repository: " + products.size());
            System.out.println("Số lượng products trả về cho React: " + products.size());

            // Force initialize lazy collections to prevent LazyInitializationException
            for (Product p : products) {
                if (p.getVariants() != null)
                    p.getVariants().size();
                if (p.getImages() != null)
                    p.getImages().size();
            }

            if (products.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message",
                        "Hiện tại cửa hàng chưa có sản phẩm khớp với nhận diện trên (Hãng, Loại giày hoặc Màu sắc).",
                        "aiResult", aiResult));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "aiResult", aiResult,
                    "products", products));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi AI Backend: " + e.getMessage()));
        }
    }
}
// rebuild
