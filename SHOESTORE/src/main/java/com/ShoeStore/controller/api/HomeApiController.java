package com.ShoeStore.controller.api;

import com.ShoeStore.service.FlashSaleService;
import com.ShoeStore.service.BannerService;
import com.ShoeStore.model.FlashSale;
import com.ShoeStore.model.FlashSaleProduct;
import com.ShoeStore.model.Banner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashMap;

@RestController
@RequestMapping("/api/home")
public class HomeApiController {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private FlashSaleService flashSaleService;

    @Autowired
    private BannerService bannerService;

    @GetMapping
    public ResponseEntity<?> getHomeData() {
        try {
            // 1. Banner images
            List<Banner> activeBanners = bannerService.findActiveBanners();
            List<String> bannerImages = activeBanners.stream()
                    .filter(b -> b.getImages() != null)
                    .flatMap(b -> b.getImages().stream())
                    .map(img -> "/images/" + img.getImageUrl())
                    .collect(Collectors.toList());

            // Lấy danh sách thương hiệu hoạt động (status = 1)
            List<Map<String, Object>> activeBrandRows = jdbc.queryForList("SELECT brand_name as name FROM brands WHERE status = 1");
            java.util.Set<String> activeBrandNamesLower = activeBrandRows.stream()
                    .map(b -> b.get("name") != null ? b.get("name").toString().trim().toLowerCase() : "")
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());

            // 2. Active Flash Sale & Flash Products
            Map<String, Object> flashSaleMap = new HashMap<>();
            List<Map<String, Object>> flashProductsMap = new java.util.ArrayList<>();

            Optional<FlashSale> activeFlashSale = flashSaleService.getActiveFlashSale();
            if (activeFlashSale.isPresent()) {
                FlashSale fs = activeFlashSale.get();
                flashSaleMap.put("id", fs.getId());
                flashSaleMap.put("name", fs.getName());
                flashSaleMap.put("startDate", fs.getStartDate());
                flashSaleMap.put("endDate", fs.getEndDate());

                List<FlashSaleProduct> flashProducts = flashSaleService.getProductsByFlashSaleId(fs.getId());
                flashProductsMap = flashProducts.stream()
                        .filter(fsp -> {
                            var p = fsp.getProduct();
                            if (p == null) return false;
                            if (p.getStatus() != null && p.getStatus() == 0) return false;
                            if (p.getCategory() != null && !p.getCategory().isActive()) return false;
                            if (p.getBrandName() != null && !p.getBrandName().trim().isEmpty()) {
                                return activeBrandNamesLower.contains(p.getBrandName().trim().toLowerCase());
                            }
                            return true;
                        })
                        .map(fsp -> {
                    Map<String, Object> fMap = new HashMap<>();
                    fMap.put("id", fsp.getId());
                    fMap.put("salePrice", fsp.getSalePrice());
                    
                    Map<String, Object> pMap = new HashMap<>();
                    var p = fsp.getProduct();
                    pMap.put("id", p.getId());
                    pMap.put("productName", p.getProductName());
                    pMap.put("brandName", p.getBrandName());
                    
                    // Main image URL
                    String mainImg = "";
                    if (p.getImages() != null && !p.getImages().isEmpty()) {
                        mainImg = "/images/" + p.getImages().iterator().next().getImageUrl();
                    }
                    pMap.put("imageUrl", mainImg);

                    // Min price representing old price
                    double oldPrice = 0;
                    if (p.getVariants() != null && !p.getVariants().isEmpty()) {
                        var firstVar = p.getVariants().iterator().next();
                        if (firstVar != null && firstVar.getPrice() != null) {
                            oldPrice = firstVar.getPrice().doubleValue();
                        }
                    }
                    pMap.put("oldPrice", oldPrice);

                    fMap.put("product", pMap);
                    return fMap;
                }).collect(Collectors.toList());
            }

            // 3. Latest products (8)
            String sql = "SELECT TOP 8 p.id, p.product_name, c.category_name as brand_name, " +
                    "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, "
                    +
                    "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price " +
                    "FROM products p " +
                    "LEFT JOIN categories c ON p.category_id = c.id " +
                    "LEFT JOIN brands b ON LOWER(p.brand_name) = LOWER(b.brand_name) " +
                    "WHERE p.status = 1 AND (c.status IS NULL OR c.status = 1) AND (b.status IS NULL OR b.status = 1) " +
                    "ORDER BY p.created_at DESC";

            List<Map<String, Object>> latestProducts = jdbc.queryForList(sql);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("bannerImages", bannerImages);
            response.put("activeFlashSale", flashSaleMap.isEmpty() ? null : flashSaleMap);
            response.put("flashProducts", flashProductsMap);
            response.put("latestProducts", latestProducts);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
