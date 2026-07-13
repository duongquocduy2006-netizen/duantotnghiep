package com.ShoeStore.controller;

import com.ShoeStore.model.ImageSearchResult;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.ImageSearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class ImageSearchRestController {

    @Autowired
    private ImageSearchService imageSearchService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    @PostMapping("/image-search")
    public ResponseEntity<?> searchByImage(@RequestParam("file") MultipartFile file) {
        try {
            ImageSearchResult aiResult = imageSearchService.analyzeImage(file);

            String brand = aiResult.getBrand().trim();
            String category = aiResult.getCategory().trim();
            String color = aiResult.getColor().trim();

            if (brand.isEmpty() && category.isEmpty() && color.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message",
                        "AI không thể nhận diện được thông tin Hãng, Loại hoặc Màu sắc. Vui lòng thử lại với ảnh rõ hơn."));
            }

            System.out.println("============== [AI SEARCH DEBUG] ==============");
            System.out.println("Brand AI nhận diện: " + brand);
            System.out.println("Category AI nhận diện: " + category);
            System.out.println("Color AI nhận diện: " + color);
            System.out.println("===============================================");

            if (brand.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "AI không nhận ra thương hiệu. Vui lòng thử ảnh rõ hơn hoặc có logo thương hiệu.",
                        "aiResult", aiResult,
                        "products", Collections.emptyList()));
            }

            // ── Tìm ID sản phẩm theo thứ tự ưu tiên (dùng repository) ──
            List<com.ShoeStore.model.Product> jpaProducts = Collections.emptyList();
            String matchLevel = "brand";

            if (!category.isEmpty() && !color.isEmpty()) {
                jpaProducts = productRepository.searchByBrandCategoryColor(brand, category, color, Pageable.unpaged());
                if (!jpaProducts.isEmpty())
                    matchLevel = "brand+category+color";
            }
            if (jpaProducts.isEmpty() && !category.isEmpty()) {
                jpaProducts = productRepository.searchByBrandCategory(brand, category, Pageable.unpaged());
                if (!jpaProducts.isEmpty())
                    matchLevel = "brand+category";
            }
            if (jpaProducts.isEmpty() && !color.isEmpty()) {
                jpaProducts = productRepository.searchByBrandColor(brand, color, Pageable.unpaged());
                if (!jpaProducts.isEmpty())
                    matchLevel = "brand+color";
            }
            if (jpaProducts.isEmpty()) {
                jpaProducts = productRepository.searchByBrand(brand, Pageable.unpaged());
                matchLevel = "brand";
            }

            System.out.println("[AI SEARCH] Match level: " + matchLevel + " | Số sản phẩm: " + jpaProducts.size());

            if (jpaProducts.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Không tìm thấy sản phẩm nào của thương hiệu \"" + brand + "\" trong hệ thống.",
                        "aiResult", aiResult,
                        "products", Collections.emptyList()));
            }

            // ── Lấy IDs rồi query bằng JDBC để trả về cùng format với /api/products/search
            // ──
            List<Integer> ids = jpaProducts.stream()
                    .map(com.ShoeStore.model.Product::getId)
                    .collect(java.util.stream.Collectors.toList());

            String inClause = ids.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));

            String sql = "SELECT p.id, p.product_name, p.brand_name, " +
                    "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, "
                    +
                    "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price, " +
                    "(SELECT SUM(pv2.quantity) FROM product_variants pv2 WHERE pv2.product_id = p.id AND pv2.quantity > 0) as quantity "
                    +
                    "FROM products p " +
                    "LEFT JOIN categories c ON p.category_id = c.id " +
                    "WHERE p.id IN (" + inClause + ") " +
                    "AND p.status = 1 AND c.status = 1 " +
                    "ORDER BY p.created_at DESC";

            List<Map<String, Object>> products = jdbc.queryForList(sql);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "aiResult", aiResult,
                    "matchLevel", matchLevel,
                    "products", products));

        } catch (Exception e) {
            e.printStackTrace();
            if ("EX_503_OVERLOAD".equals(e.getMessage())) {
                return ResponseEntity.status(503).body(Map.of(
                        "success", false,
                        "message",
                        "Hệ thống AI hiện đang quá tải do có nhiều lượt truy cập. Vui lòng thử lại sau ít phút!"));
            }
            if ("EX_429_QUOTA".equals(e.getMessage())) {
                return ResponseEntity.status(429).body(Map.of(
                        "success", false,
                        "message",
                        "AI đã đạt giới hạn miễn phí hôm nay. Vui lòng thử lại vào ngày mai hoặc liên hệ quản trị viên!"));
            }
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi AI Backend: " + e.getMessage()));
        }
    }
}
