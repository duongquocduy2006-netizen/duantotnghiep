package com.ShoeStore.controller.api;

import com.ShoeStore.model.*;
import com.ShoeStore.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
public class ProductApiController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private ColorRepository colorRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Autowired
    private com.ShoeStore.service.FlashSaleService flashSaleService;

    @Autowired
    private com.ShoeStore.service.impl.GeminiVisionService geminiVisionService;

    // 0. AI VISION AUTO-EXTRACT PRODUCT DETAILS
    @PostMapping("/ai-extract")
    public ResponseEntity<?> extractProductInfoFromImage(@RequestBody Map<String, String> payload) {
        try {
            String imageBase64 = payload.get("imageBase64");
            String fileName = payload.get("fileName");
            String productName = payload.get("productName");
            String brandName = payload.get("brandName");
            String categoryName = payload.get("categoryName");

            if ((imageBase64 == null || imageBase64.trim().isEmpty()) && (productName == null || productName.trim().isEmpty())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng cung cấp ảnh hoặc tên sản phẩm để AI nhận diện!"));
            }

            Map<String, Object> result;
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                result = geminiVisionService.extractProductInfoFromImage(imageBase64, fileName, productName, brandName, categoryName);
            } else {
                result = geminiVisionService.extractProductInfoFromText(productName, brandName, categoryName);
            }

            if (Boolean.TRUE.equals(result.get("success"))) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi nhận diện AI: " + e.getMessage()));
        }
    }

    // 1. LẤY DANH SÁCH SẢN PHẨM
    @GetMapping
    public ResponseEntity<?> getAllProducts() {
        List<Product> products = productRepository.findAll();
        List<Map<String, Object>> response = products.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("productName", p.getProductName() != null ? p.getProductName() : "Chưa có tên");
            map.put("productCode", p.getProductCode() != null ? p.getProductCode() : "N/A");
            map.put("brandName", p.getBrandName() != null ? p.getBrandName() : "Chưa rõ");
            map.put("status", p.getStatus() != null ? p.getStatus() : 1);
            map.put("categoryName", p.getCategory() != null ? p.getCategory().getName() : "Chưa phân loại");

            // Xác định ảnh
            String mainImage = "";
            if (p.getImages() != null && !p.getImages().isEmpty()) {
                mainImage = "/images/" + p.getImages().iterator().next().getImageUrl();
            } else {
                mainImage = "https://ui-avatars.com/api/?name=" + map.get("productName").toString().charAt(0)
                        + "&background=121212&color=00f2ff&bold=true";
            }
            map.put("imageUrl", mainImage);

            // Số lượng biến thể & Giá đại diện (giá của biến thể đầu tiên)
            int variantCount = (p.getVariants() != null) ? p.getVariants().size() : 0;
            BigDecimal price = null;
            if (variantCount > 0 && p.getVariants().iterator().next().getPrice() != null) {
                price = p.getVariants().iterator().next().getPrice();
            }
            map.put("variantCount", variantCount);
            map.put("price", price);

            if (p.getVariants() != null) {
                List<Map<String, Object>> vList = p.getVariants().stream().map(v -> {
                    Map<String, Object> vMap = new HashMap<>();
                    vMap.put("id", v.getId());
                    vMap.put("sizeName", v.getSize() != null ? v.getSize().getSizeName() : "");
                    vMap.put("colorName", v.getColor() != null ? v.getColor().getColorName() : "");
                    vMap.put("price", v.getPrice());
                    return vMap;
                }).collect(Collectors.toList());
                map.put("variants", vList);
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 1.5. LẤY DANH SÁCH METADATA ĐỂ TẠO SẢN PHẨM
    @GetMapping("/metadata")
    public ResponseEntity<?> getProductMetadata() {
        try {
            List<Map<String, Object>> categories = categoryRepository.findAll().stream().map(c -> {
                Map<String, Object> cMap = new HashMap<>();
                cMap.put("id", c.getId());
                cMap.put("name", c.getName());
                return cMap;
            }).collect(Collectors.toList());

            List<Map<String, Object>> brands = brandRepository.findAll().stream().map(b -> {
                Map<String, Object> bMap = new HashMap<>();
                bMap.put("id", b.getId());
                bMap.put("brandName", b.getName());
                return bMap;
            }).collect(Collectors.toList());

            List<Map<String, Object>> sizes = sizeRepository.findAll().stream().map(s -> {
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("id", s.getId());
                sMap.put("sizeName", s.getSizeName());
                return sMap;
            }).collect(Collectors.toList());

            List<Map<String, Object>> colors = colorRepository.findAll().stream().map(c -> {
                Map<String, Object> cMap = new HashMap<>();
                cMap.put("id", c.getId());
                cMap.put("colorName", c.getColorName());
                return cMap;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "categories", categories,
                    "brands", brands,
                    "sizes", sizes,
                    "colors", colors));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lấy dữ liệu cấu hình: " + e.getMessage()));
        }
    }

    // 2. LẤY CHI TIẾT SẢN PHẨM DÀNH CHO ADMIN HOẶC CLIENT
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductDetail(
            @PathVariable Integer id,
            @RequestParam(value = "admin", required = false, defaultValue = "false") boolean isAdmin,
            jakarta.servlet.http.HttpSession session) {
        java.util.Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Không tìm thấy sản phẩm!"));
        }

        Product product = productOpt.get();

        if (!isAdmin) {
            // 1. Kiểm tra trạng thái sản phẩm
            if (product.getStatus() != null && product.getStatus() == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Sản phẩm hiện đang bị ẩn!"));
            }

            // 2. Kiểm tra trạng thái danh mục
            if (product.getCategory() != null && !product.getCategory().isActive()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Danh mục của sản phẩm này đã bị ẩn!"));
            }

            // 3. Kiểm tra trạng thái thương hiệu
            if (product.getBrandName() != null && !product.getBrandName().trim().isEmpty()) {
                String bNameTrim = product.getBrandName().trim();
                List<Brand> allBrands = brandRepository.findAll();
                boolean brandActive = allBrands.stream()
                        .anyMatch(b -> b.getName() != null && b.getName().equalsIgnoreCase(bNameTrim) && b.isActive());
                if (!brandActive) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("success", false, "message", "Thương hiệu của sản phẩm này đã bị ẩn!"));
                }
            }
        }

        // Map product details
        Map<String, Object> prodMap = new HashMap<>();
        prodMap.put("id", product.getId());
        prodMap.put("productName", product.getProductName());
        prodMap.put("productCode", product.getProductCode());
        prodMap.put("brandName", product.getBrandName());
        prodMap.put("status", product.getStatus() != null ? product.getStatus() : 1);
        prodMap.put("description", product.getDescription());
        prodMap.put("categoryId", product.getCategory() != null ? product.getCategory().getId() : null);
        prodMap.put("categoryName", product.getCategory() != null ? product.getCategory().getName() : "");

        String mainImg = "";
        if (product.getImages() != null && !product.getImages().isEmpty()) {
            ProductImage firstImg = product.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .orElse(product.getImages().iterator().next());
            if (firstImg != null && firstImg.getImageUrl() != null) {
                mainImg = "/images/" + firstImg.getImageUrl();
            }
        }
        prodMap.put("imageUrl", mainImg);

        // Map variants
        List<Map<String, Object>> variantsList = product.getVariants().stream().map(v -> {
            Map<String, Object> vMap = new HashMap<>();
            vMap.put("id", v.getId());
            vMap.put("sizeId", v.getSize() != null ? v.getSize().getId() : null);
            vMap.put("sizeName", v.getSize() != null ? v.getSize().getSizeName() : "");
            vMap.put("colorId", v.getColor() != null ? v.getColor().getId() : null);
            vMap.put("colorName", v.getColor() != null ? fixColorName(v.getColor().getColorName()) : "");
            vMap.put("price", v.getPrice());
            vMap.put("quantity", v.getQuantity());
            return vMap;
        }).collect(Collectors.toList());

        // Map images
        List<Map<String, Object>> imagesList = product.getImages().stream().map(img -> {
            Map<String, Object> iMap = new HashMap<>();
            iMap.put("id", img.getId());
            iMap.put("url", "/images/" + img.getImageUrl());
            iMap.put("isPrimary", img.getIsPrimary());
            return iMap;
        }).collect(Collectors.toList());

        // Metadata for dropdowns
        List<Map<String, Object>> categories = categoryRepository.findAll().stream().map(c -> {
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", c.getId());
            cMap.put("name", c.getName());
            return cMap;
        }).collect(Collectors.toList());

        List<Map<String, Object>> brands = brandRepository.findAll().stream().map(b -> {
            Map<String, Object> bMap = new HashMap<>();
            bMap.put("id", b.getId());
            bMap.put("brandName", b.getName());
            return bMap;
        }).collect(Collectors.toList());

        List<Map<String, Object>> sizes = sizeRepository.findAll().stream().map(s -> {
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("id", s.getId());
            sMap.put("sizeName", s.getSizeName());
            return sMap;
        }).collect(Collectors.toList());

        List<Map<String, Object>> colors = colorRepository.findAll().stream().map(c -> {
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", c.getId());
            cMap.put("colorName", fixColorName(c.getColorName()));
            return cMap;
        }).collect(Collectors.toList());

        // --- FETCH REVIEWS DATA ---
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) session.getAttribute("account");
        
        String sqlAllReviews;
        List<Map<String, Object>> allEntries;
        
        if (account != null) {
            Integer currentUserId = (Integer) account.get("id");
            sqlAllReviews = "SELECT r.*, COALESCE(r.is_hidden, 0) as is_hidden, a.full_name as user_name, a.role, r.like_count, " +
                    "(SELECT COUNT(*) FROM product_review_likes prl WHERE prl.review_id = r.id AND prl.user_id = ?) as user_liked " +
                    "FROM product_reviews r " +
                    "JOIN accounts a ON r.user_id = a.id " +
                    "WHERE r.product_id = ? " +
                    "ORDER BY r.created_at ASC";
            allEntries = jdbc.queryForList(sqlAllReviews, currentUserId, id);
        } else {
            sqlAllReviews = "SELECT r.*, COALESCE(r.is_hidden, 0) as is_hidden, a.full_name as user_name, a.role, r.like_count, 0 as user_liked " +
                    "FROM product_reviews r " +
                    "JOIN accounts a ON r.user_id = a.id " +
                    "WHERE r.product_id = ? " +
                    "ORDER BY r.created_at ASC";
            allEntries = jdbc.queryForList(sqlAllReviews, id);
        }

        List<Map<String, Object>> parents = new java.util.ArrayList<>();
        Map<Integer, Map<String, Object>> parentMap = new java.util.HashMap<>();

        for (Map<String, Object> entry : allEntries) {
            Integer entryId = (Integer) entry.get("id");
            if (entry.get("parent_id") == null) {
                entry.put("replies", new java.util.ArrayList<Map<String, Object>>());
                parents.add(entry);
                parentMap.put(entryId, entry);
            }
        }
        for (Map<String, Object> entry : allEntries) {
            Integer parentId = (Integer) entry.get("parent_id");
            if (parentId != null) {
                Map<String, Object> parent = parentMap.get(parentId);
                if (parent != null) {
                    ((java.util.List<Map<String, Object>>) parent.get("replies")).add(entry);
                }
            }
        }
        parents.sort((a, b) -> ((java.util.Date) b.get("created_at")).compareTo((java.util.Date) a.get("created_at")));

        String sqlRatingStats = "SELECT COUNT(*) as count, AVG(CAST(rating AS FLOAT)) as avg_rating " +
                "FROM product_reviews WHERE product_id = ? AND parent_id IS NULL AND (is_hidden IS NULL OR is_hidden = 0)";
        Map<String, Object> stats = jdbc.queryForMap(sqlRatingStats, id);
        
        boolean hasPurchased = false;
        if (account != null) {
            String sqlCheckPurchase = "SELECT COUNT(*) FROM orders o " +
                    "JOIN order_items oi ON o.id = oi.order_id " +
                    "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                    "WHERE o.user_id = ? AND pv.product_id = ? AND o.status = 3";
            Integer count = jdbc.queryForObject(sqlCheckPurchase, Integer.class, account.get("id"), id);
            hasPurchased = (count != null && count > 0);
        }
        // --------------------------

        // --- FLASH SALE CHECK ---
        Map<String, Object> flashSaleInfo = null;
        try {
            java.util.Optional<com.ShoeStore.model.FlashSale> activeFs = flashSaleService.getActiveFlashSale();
            if (activeFs.isPresent()) {
                com.ShoeStore.model.FlashSale fs = activeFs.get();
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                boolean isLive = (now.isAfter(fs.getStartDate()) || now.isEqual(fs.getStartDate())) && (now.isBefore(fs.getEndDate()) || now.isEqual(fs.getEndDate()));
                boolean isUpcoming = now.isBefore(fs.getStartDate());

                List<com.ShoeStore.model.FlashSaleProduct> fspList = flashSaleService.getProductsByFlashSaleId(fs.getId());
                for (com.ShoeStore.model.FlashSaleProduct fsp : fspList) {
                    if (fsp.getProduct() != null && fsp.getProduct().getId().equals(id)) {
                        flashSaleInfo = new HashMap<>();
                        flashSaleInfo.put("isLive", isLive);
                        flashSaleInfo.put("isUpcoming", isUpcoming);
                        flashSaleInfo.put("campaignName", fs.getName());
                        flashSaleInfo.put("startDate", fs.getStartDate());
                        flashSaleInfo.put("endDate", fs.getEndDate());
                        flashSaleInfo.put("quantityLimit", fsp.getQuantityLimit());
                        flashSaleInfo.put("soldQuantity", fsp.getSoldQuantity());

                        flashSaleInfo.put("salePrice", fsp.getSalePrice() != null ? fsp.getSalePrice().doubleValue() : 0.0);

                        // Calculate original price from first variant
                        double origPrice = 0;
                        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
                            var firstVar = product.getVariants().iterator().next();
                            if (firstVar != null && firstVar.getPrice() != null) {
                                origPrice = firstVar.getPrice().doubleValue();
                            }
                        }
                        flashSaleInfo.put("originalPrice", origPrice);
                        if (origPrice > 0 && fsp.getSalePrice() != null) {
                            int discountPercent = (int) Math.round((1.0 - fsp.getSalePrice().doubleValue() / origPrice) * 100);
                            if (discountPercent < 0) {
                                discountPercent = 0;
                            }
                            flashSaleInfo.put("discountPercent", discountPercent);
                        }
                        break;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // --------------------------

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("success", true);
        responseMap.put("product", prodMap);
        responseMap.put("variants", variantsList);
        responseMap.put("images", imagesList);
        responseMap.put("categories", categories);
        responseMap.put("brands", brands);
        responseMap.put("sizes", sizes);
        responseMap.put("colors", colors);
        responseMap.put("reviews", parents);
        responseMap.put("reviewCount", stats.get("count"));
        responseMap.put("avgRating", stats.get("avg_rating") != null ? stats.get("avg_rating") : 0.0);
        responseMap.put("hasPurchased", hasPurchased);
        if (flashSaleInfo != null) {
            responseMap.put("flashSale", flashSaleInfo);
        }

        return ResponseEntity.ok(responseMap);
    }

    // 3. LƯU HOẶC CẬP NHẬT SẢN PHẨM
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveProduct(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = (Integer) payload.get("id");
            String productName = (String) payload.get("productName");
            String productCode = (String) payload.get("productCode");
            String brandName = (String) payload.get("brandName");
            Integer categoryId = (Integer) payload.get("categoryId");
            String description = (String) payload.get("description");
            Integer status = (Integer) payload.get("status");
            String imageBase64 = (String) payload.get("imageBase64");

            if (productName == null || productName.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Tên sản phẩm không được trống!"));
            }

            Product product;
            if (id != null) {
                product = productRepository.findById(id).orElse(new Product());
            } else {
                product = new Product();
            }

            product.setProductName(productName);

            if (productCode == null || productCode.trim().isEmpty()) {
                if (product.getProductCode() == null) {
                    product.setProductCode("PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                }
            } else {
                product.setProductCode(productCode);
            }

            product.setBrandName(brandName);
            product.setDescription(description);
            product.setStatus(status != null ? status : 1);

            // Auto-ensure Brand exists in brands table for filters & SQL queries
            if (brandName != null && !brandName.trim().isEmpty()) {
                String bNameTrim = brandName.trim();
                boolean exists = brandRepository.findAll().stream()
                        .anyMatch(b -> b.getName() != null && b.getName().equalsIgnoreCase(bNameTrim));
                if (!exists) {
                    Brand newB = new Brand();
                    newB.setName(bNameTrim);
                    newB.setActive(true);
                    brandRepository.save(newB);
                }
            }

            // Auto-assign Category
            if (categoryId != null) {
                Category cat = categoryRepository.findById(categoryId).orElse(null);
                product.setCategory(cat);
            } else {
                List<Category> allCats = categoryRepository.findAll();
                if (!allCats.isEmpty()) {
                    product.setCategory(allCats.get(0));
                }
            }

            Product savedProduct = productRepository.save(product);

            // Xử lý lưu danh sách hoặc 1 ảnh Base64
            @SuppressWarnings("unchecked")
            List<String> imagesBase64 = (List<String>) payload.get("imagesBase64");
            if (imagesBase64 != null && !imagesBase64.isEmpty()) {
                String uploadDir = System.getProperty("user.dir") + "/uploads/";
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                for (int i = 0; i < imagesBase64.size(); i++) {
                    String b64 = imagesBase64.get(i);
                    if (b64 == null || b64.trim().isEmpty()) continue;
                    try {
                        String base64Data = b64.contains(",") ? b64.split(",")[1] : b64;
                        byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                        String fileName = UUID.randomUUID().toString() + ".jpg";

                        String filePath = uploadDir + fileName;
                        try (FileOutputStream fos = new FileOutputStream(filePath)) {
                            fos.write(decodedBytes);
                        }

                        ProductImage img = new ProductImage();
                        img.setProduct(savedProduct);
                        img.setImageUrl(fileName);
                        img.setIsPrimary(i == 0); // Ảnh 1 làm Ảnh chính!
                        productImageRepository.save(img);
                    } catch (Exception imgErr) {
                        System.err.println("Lỗi lưu ảnh thứ " + (i + 1) + ": " + imgErr.getMessage());
                    }
                }
            } else if (imageBase64 != null && !imageBase64.isEmpty()) {
                String base64Data = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;
                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                String fileName = UUID.randomUUID().toString() + ".jpg";

                String uploadDir = System.getProperty("user.dir") + "/uploads/";
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                String filePath = uploadDir + fileName;
                try (FileOutputStream fos = new FileOutputStream(filePath)) {
                    fos.write(decodedBytes);
                }

                ProductImage img = new ProductImage();
                img.setProduct(savedProduct);
                img.setImageUrl(fileName);
                img.setIsPrimary(true);
                productImageRepository.save(img);
            }

            return ResponseEntity.ok(
                    Map.of("success", true, "productId", savedProduct.getId(), "message", "Lưu sản phẩm thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu sản phẩm: " + e.getMessage()));
        }
    }

    private String capitalize(String s) {
        if (s == null || s.trim().isEmpty())
            return s;
        s = s.trim();
        if (s.length() <= 1)
            return s.toUpperCase();
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }

    // 4. LƯU BIẾN THỂ CỦA SẢN PHẨM
    @PostMapping("/variant/save")
    @Transactional
    public ResponseEntity<?> saveVariant(@RequestBody Map<String, Object> payload) {
        try {
            Integer productId = (Integer) payload.get("productId");
            String sku = (String) payload.get("sku");
            if (sku == null) {
                sku = (String) payload.get("productCode");
            }
            Integer variantId = (Integer) payload.get("variantId");
            Integer sizeId = (Integer) payload.get("sizeId");
            Integer colorId = (Integer) payload.get("colorId");
            String newColorName = (String) payload.get("newColorName");
            String newSizeName = (String) payload.get("newSizeName");
            BigDecimal price = null;
            if (payload.get("price") != null) {
                price = new BigDecimal(payload.get("price").toString());
            }
            Integer quantity = (Integer) payload.get("quantity");

            Product product = null;
            if (productId != null) {
                product = productRepository.findById(productId).orElse(null);
            }
            if (product == null && sku != null && !sku.trim().isEmpty()) {
                product = productRepository.findByProductCode(sku.trim()).orElse(null);
            }

            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu productId hoặc SKU sản phẩm không tồn tại!"));
            }

            // Validate and create new color
            if (newColorName != null && !newColorName.trim().isEmpty()) {
                String normalized = capitalize(newColorName);
                if (normalized.matches(".*\\d.*")) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Tên màu không được chứa số!"));
                }
                if (normalized.length() < 2 || normalized.length() > 50) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Tên màu phải từ 2 đến 50 ký tự!"));
                }

                java.util.Optional<Color> existing = colorRepository.findByColorName(normalized);
                if (existing.isPresent()) {
                    colorId = existing.get().getId();
                } else {
                    Color newColor = new Color();
                    newColor.setColorName(normalized);
                    colorRepository.save(newColor);
                    colorId = newColor.getId();
                }
            }

            // Validate and create new size
            if (newSizeName != null && !newSizeName.trim().isEmpty()) {
                String normalized = newSizeName.trim();
                if (!normalized.matches("^\\d+$")) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Kích cỡ phải là số (không được chứa chữ)!"));
                }
                int sVal = Integer.parseInt(normalized);
                if (sVal < 1 || sVal > 99) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Kích cỡ phải từ 1 đến 99!"));
                }

                java.util.Optional<Size> existing = sizeRepository.findBySizeName(normalized);
                if (existing.isPresent()) {
                    sizeId = existing.get().getId();
                } else {
                    Size newSize = new Size();
                    newSize.setSizeName(normalized);
                    sizeRepository.save(newSize);
                    sizeId = newSize.getId();
                }
            }

            if (sizeId == null || colorId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Vui lòng chọn hoặc nhập đầy đủ Size và Màu sắc!"));
            }

            if (price == null || price.compareTo(new BigDecimal(5000)) <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Giá bán phải lớn hơn 5,000 VNĐ!"));
            }

            // CHECK FLASH SALE VALIDATION: Chặn đổi giá sản phẩm nhỏ hơn hoặc bằng giá Flash Sale đang/sắp chạy
            try {
                String checkFsSql = "SELECT fsp.sale_price, fs.name FROM flash_sale_products fsp " +
                        "JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                        "WHERE fsp.product_id = ? AND fs.end_date >= GETDATE()";
                java.util.List<java.util.Map<String, Object>> activeFsList = jdbc.queryForList(checkFsSql, product.getId());
                for (java.util.Map<String, Object> fsRow : activeFsList) {
                    BigDecimal fsSalePrice = fsRow.get("sale_price") != null ? new BigDecimal(fsRow.get("sale_price").toString()) : null;
                    String fsName = (String) fsRow.get("name");
                    if (fsSalePrice != null) {
                        int cmp = price.compareTo(fsSalePrice);
                        if (cmp < 0) {
                            return ResponseEntity.badRequest().body(Map.of("success", false, "message", 
                                    "Lỗi: Giá gốc (" + String.format("%,.0f", price.doubleValue()) + "đ) không được THẤP HƠN giá Flash Sale (" + String.format("%,.0f", fsSalePrice.doubleValue()) + "đ) của chiến dịch '" + fsName + "'!"));
                        } else if (cmp == 0) {
                            return ResponseEntity.badRequest().body(Map.of("success", false, "message", 
                                    "Lỗi: Giá gốc (" + String.format("%,.0f", price.doubleValue()) + "đ) không được BẰNG giá Flash Sale (" + String.format("%,.0f", fsSalePrice.doubleValue()) + "đ) của chiến dịch '" + fsName + "'!"));
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore query error
            }

            if (quantity == null || quantity < 1) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Số lượng tồn kho thêm mới phải từ 1 trở lên!"));
            }

            Size size = sizeRepository.findById(sizeId).orElse(null);
            Color color = colorRepository.findById(colorId).orElse(null);

            if (size == null || color == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Size hoặc Màu không hợp lệ!"));
            }

            ProductVariant variant;
            boolean accumulated = false;
            int totalQty = quantity;

            if (variantId == null) {
                // ADD NEW: If duplicate variant (same product/SKU, size, color) exists, ACCUMULATE (cộng dồn)
                java.util.Optional<ProductVariant> duplicate = productVariantRepository
                        .findByProductAndSizeAndColor(product, size, color);
                if (duplicate.isPresent()) {
                    variant = duplicate.get();
                    int currentQty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                    totalQty = currentQty + quantity;
                    variant.setQuantity(totalQty);
                    if (price != null) {
                        variant.setPrice(price);
                    }
                    accumulated = true;
                } else {
                    variant = new ProductVariant();
                    variant.setProduct(product);
                    variant.setSize(size);
                    variant.setColor(color);
                    variant.setPrice(price);
                    variant.setQuantity(quantity);
                    variant.setStatus(1);
                }
            } else {
                // EDIT: Check if target (size, color) clashes with another variant
                variant = productVariantRepository.findById(variantId).orElse(null);
                if (variant == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Không tìm thấy biến thể chỉnh sửa!"));
                }

                java.util.Optional<ProductVariant> clash = productVariantRepository
                        .findByProductAndSizeAndColor(product, size, color);
                if (clash.isPresent() && !clash.get().getId().equals(variantId)) {
                    // Merge/accumulate variant into clash variant
                    ProductVariant clashVariant = clash.get();
                    int currentQty = clashVariant.getQuantity() != null ? clashVariant.getQuantity() : 0;
                    totalQty = currentQty + quantity;
                    clashVariant.setQuantity(totalQty);
                    if (price != null) {
                        clashVariant.setPrice(price);
                    }
                    productVariantRepository.save(clashVariant);

                    // Remove old merged variantId
                    productVariantRepository.deleteRelatedCartItems(variantId);
                    productVariantRepository.deleteById(variantId);

                    return ResponseEntity.ok(Map.of(
                        "success", true,
                        "accumulated", true,
                        "message", "Đã cộng dồn biến thể trùng Size " + size.getSizeName() + " - Màu " + color.getColorName() + " (Tổng tồn kho: " + totalQty + ")!"
                    ));
                } else {
                    variant.setProduct(product);
                    variant.setSize(size);
                    variant.setColor(color);
                    variant.setPrice(price);
                    variant.setQuantity(quantity);
                    variant.setStatus(1);
                }
            }

            productVariantRepository.save(variant);

            String message = accumulated
                    ? "Đã cộng dồn " + quantity + " sản phẩm vào biến thể Size " + size.getSizeName() + " - Màu " + color.getColorName() + " (Tổng tồn kho: " + totalQty + ")!"
                    : "Lưu biến thể thành công!";

            return ResponseEntity.ok(Map.of("success", true, "accumulated", accumulated, "message", message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu biến thể: " + e.getMessage()));
        }
    }

    // 4.5 CẬP NHẬT BIẾN THỂ HÀNG LOẠT (BULK SAVE VARIANTS)
    @PostMapping("/variant/bulk-save")
    @Transactional
    public ResponseEntity<?> bulkSaveVariants(@RequestBody List<Map<String, Object>> payload) {
        try {
            if (payload == null || payload.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Không có dữ liệu biến thể để cập nhật!"));
            }

            int count = 0;
            for (Map<String, Object> item : payload) {
                Integer variantId = (Integer) item.get("id");
                if (variantId == null) continue;

                ProductVariant variant = productVariantRepository.findById(variantId).orElse(null);
                if (variant == null) continue;

                if (item.containsKey("price") && item.get("price") != null) {
                    Double p = Double.valueOf(item.get("price").toString());
                    if (p <= 5000) {
                        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Giá bán của tất cả biến thể phải lớn hơn 5,000đ!"));
                    }
                    variant.setPrice(java.math.BigDecimal.valueOf(p));
                }

                if (item.containsKey("quantity") && item.get("quantity") != null) {
                    Integer q = Integer.valueOf(item.get("quantity").toString());
                    if (q < 1) {
                        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Số lượng tồn kho của tất cả biến thể phải từ 1 trở lên!"));
                    }
                    variant.setQuantity(q);
                }

                productVariantRepository.save(variant);
                count++;
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thành công hàng loạt " + count + " biến thể sản phẩm!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi cập nhật hàng loạt: " + e.getMessage()));
        }
    }

    // 5. XÓA BIẾN THỂ CỦA SẢN PHẨM
    @DeleteMapping("/variant/{variantId}")
    @Transactional
    public ResponseEntity<?> deleteVariant(@PathVariable Integer variantId) {
        try {
            // 1. Kiểm tra xem biến thể có nằm trong đơn hàng đang xử lý không (Chờ xác nhận, Đang giao, Đã nhận hàng)
            if (productVariantRepository.countActiveOrderItemsByVariantId(variantId) > 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                        "Không thể xóa biến thể này vì đang có đơn hàng đang xử lý. Chỉ được xóa khi tất cả đơn hàng liên quan đã hoàn tất hoặc bị hủy!"));
            }

            // 2. Xóa các order_items liên quan trong đơn hàng đã hoàn tất/đã hủy (cho phép)
            productVariantRepository.deleteRelatedOrderItems(variantId);

            // 3. Xóa khỏi giỏ hàng trước
            productVariantRepository.deleteRelatedCartItems(variantId);

            // 4. Xóa biến thể
            productVariantRepository.deleteById(variantId);

            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa biến thể thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xóa biến thể: " + e.getMessage()));
        }
    }

    // 5.1 XÓA ẢNH SẢN PHẨM
    @DeleteMapping("/image/{imageId}")
    @Transactional
    public ResponseEntity<?> deleteImage(@PathVariable Integer imageId) {
        try {
            java.util.Optional<ProductImage> imgOpt = productImageRepository.findById(imageId);
            if (imgOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy ảnh!"));
            }

            ProductImage img = imgOpt.get();
            // Optional: delete physical file
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            File file = new File(uploadDir + img.getImageUrl());
            if (file.exists()) {
                file.delete();
            }

            productImageRepository.deleteById(imageId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa ảnh thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi xóa ảnh: " + e.getMessage()));
        }
    }

    // 5.2.1 XÓA SIZE THEO TÊN (Nếu không còn biến thể nào dùng)
    @PostMapping("/size/delete-name")
    @Transactional
    public ResponseEntity<?> deleteSizeByName(@RequestBody Map<String, String> payload) {
        try {
            String sizeName = payload.get("sizeName");
            if (sizeName != null && !sizeName.trim().isEmpty()) {
                String cleanName = sizeName.trim();
                java.util.Optional<Size> sOpt = sizeRepository.findBySizeName(cleanName);
                if (sOpt.isPresent()) {
                    Size s = sOpt.get();
                    long usageCount = productVariantRepository.findAll().stream()
                            .filter(v -> v.getSize() != null && v.getSize().getId().equals(s.getId()))
                            .count();
                    if (usageCount == 0) {
                        sizeRepository.delete(s);
                    }
                }
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa size thành công!"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true));
        }
    }

    // 5.2.2 XÓA MÀU THEO TÊN (Nếu không còn biến thể nào dùng)
    @PostMapping("/color/delete-name")
    @Transactional
    public ResponseEntity<?> deleteColorByName(@RequestBody Map<String, String> payload) {
        try {
            String colorName = payload.get("colorName");
            if (colorName != null && !colorName.trim().isEmpty()) {
                String cleanName = colorName.trim();
                java.util.Optional<Color> cOpt = colorRepository.findByColorName(cleanName);
                if (cOpt.isPresent()) {
                    Color c = cOpt.get();
                    long usageCount = productVariantRepository.findAll().stream()
                            .filter(v -> v.getColor() != null && v.getColor().getId().equals(c.getId()))
                            .count();
                    if (usageCount == 0) {
                        colorRepository.delete(c);
                    }
                }
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa màu thành công!"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true));
        }
    }

    // 5.2 THÊM ẢNH SẢN PHẨM
    @PostMapping("/{productId}/image")
    @Transactional
    public ResponseEntity<?> addImage(@PathVariable Integer productId, @RequestBody Map<String, String> payload) {
        try {
            String imageBase64 = payload.get("imageBase64");
            if (imageBase64 == null || imageBase64.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu dữ liệu ảnh!"));
            }

            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy sản phẩm!"));
            }

            String base64Data = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;
            byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
            String fileName = UUID.randomUUID().toString() + ".jpg";

            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists())
                dir.mkdirs();

            String filePath = uploadDir + fileName;
            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                fos.write(decodedBytes);
            }

            ProductImage img = new ProductImage();
            img.setProduct(product);
            img.setImageUrl(fileName);
            img.setIsPrimary(false);
            productImageRepository.save(img);

            return ResponseEntity.ok(Map.of("success", true, "message", "Thêm ảnh thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi thêm ảnh: " + e.getMessage()));
        }
    }

    // 5.3 ĐẶT ẢNH LÀM ẢNH CHÍNH
    @PostMapping("/image/{imageId}/set-primary")
    @Transactional
    public ResponseEntity<?> setPrimaryImage(@PathVariable Integer imageId) {
        try {
            java.util.Optional<ProductImage> imgOpt = productImageRepository.findById(imageId);
            if (imgOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy ảnh!"));
            }

            ProductImage targetImg = imgOpt.get();
            Product product = targetImg.getProduct();

            // Set all other images for this product to NOT primary
            if (product.getImages() != null) {
                for (ProductImage img : product.getImages()) {
                    img.setIsPrimary(false);
                }
                productImageRepository.saveAll(product.getImages());
            }

            // Set target image to primary
            targetImg.setIsPrimary(true);
            productImageRepository.save(targetImg);

            return ResponseEntity.ok(Map.of("success", true, "message", "Đặt làm ảnh chính thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi đặt ảnh chính: " + e.getMessage()));
        }
    }

    // 6. XÓA SẢN PHẨM
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteProduct(@PathVariable Integer id) {
        try {
            // 1. Kiểm tra bằng JDBC thuần (tránh JPA cache) — chặn xóa nếu còn đơn hàng đang xử lý (status NOT IN (3, 4))
            Integer activeOrderCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM order_items oi " +
                "JOIN product_variants pv ON oi.product_variant_id = pv.id " +
                "JOIN orders o ON oi.order_id = o.id " +
                "WHERE pv.product_id = ? AND o.status NOT IN (3, 4)",
                Integer.class, id
            );
            System.out.println("[DEBUG] deleteProduct id=" + id + " -> activeOrderCount=" + activeOrderCount);
            if (activeOrderCount != null && activeOrderCount > 0) {
                return ResponseEntity.status(403).body(Map.of("status", "error", "message",
                        "Không thể xóa sản phẩm này vì đang có " + activeOrderCount + " đơn hàng đang xử lý. Chỉ được xóa khi tất cả đơn hàng liên quan đã hoàn tất hoặc bị hủy!"));
            }

            // 2. Xóa các dữ liệu liên quan (chỉ xóa khi không có đơn hàng đang hoạt động)
            productRepository.deleteRelatedCartItems(id);
            productRepository.deleteRelatedOrderItems(id);
            productRepository.deleteRelatedFavourites(id);
            productRepository.deleteRelatedReviews(id);
            productRepository.deleteRelatedFlashSaleProducts(id);
            productRepository.deleteRelatedImages(id);
            productRepository.deleteRelatedVariants(id);

            productRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Xóa sản phẩm thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Lỗi xóa sản phẩm: " + e.getMessage()));
        }
    }

    // 7. LẤY HÀNG MỚI VỀ (NEW ARRIVALS) TRONG VÒNG 3 NGÀY QUA DÀNH CHO CLIENT
    @GetMapping("/new-arrivals")
    public ResponseEntity<?> getNewArrivals() {
        try {
            String sql = "SELECT p.id, p.product_name, c.category_name as brand_name, " +
                    "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, "
                    + "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price, " +
                    "(SELECT TOP 1 fsp.sale_price FROM flash_sale_products fsp " +
                    " JOIN flash_sales fs ON fsp.flash_sale_id = fs.id " +
                    " WHERE fsp.product_id = p.id AND fs.status = 1 " +
                    " AND GETDATE() BETWEEN fs.start_date AND fs.end_date " +
                    " AND (fsp.quantity_limit = 0 OR fsp.quantity_limit IS NULL OR fsp.sold_quantity < fsp.quantity_limit)) as sale_price " +
                    "FROM products p " +
                    "LEFT JOIN categories c ON p.category_id = c.id " +
                    "LEFT JOIN brands b ON LOWER(p.brand_name) = LOWER(b.brand_name) " +
                    "WHERE p.status = 1 " +
                    "AND (c.status IS NULL OR c.status = 1) " +
                    "AND (b.status IS NULL OR b.status = 1) " +
                    "AND p.created_at >= DATEADD(day, -3, GETDATE()) " +
                    "ORDER BY p.created_at DESC";

            List<Map<String, Object>> newProducts = jdbc.queryForList(sql);
            return ResponseEntity.ok(Map.of("success", true, "newProducts", newProducts));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tải hàng mới: " + e.getMessage()));
        }
    }

    // 8. TÌM KIẾM VÀ LỌC SẢN PHẨM PHÍA CLIENT (SHOP / STORE)
    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> brand,
            @RequestParam(required = false) List<Integer> category,
            @RequestParam(required = false) Double min,
            @RequestParam(required = false) Double max,
            @RequestParam(required = false, defaultValue = "newest") String sort) {

        try {
            // Lấy danh sách thương hiệu và danh mục hoạt động cho bộ lọc Sidebar
            List<Map<String, Object>> activeBrands = jdbc
                    .queryForList("SELECT id, brand_name as name FROM brands WHERE status = 1 ORDER BY brand_name ASC");
            List<Map<String, Object>> activeCategories = jdbc.queryForList(
                    "SELECT id, category_name FROM categories WHERE status = 1 ORDER BY category_name ASC");

            java.util.Set<String> activeBrandNamesLower = activeBrands.stream()
                    .map(b -> b.get("name") != null ? b.get("name").toString().trim().toLowerCase() : "")
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());

            List<Product> allProducts = productRepository.findAll();

            String searchTerm = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim().toLowerCase() : ((q != null && !q.trim().isEmpty()) ? q.trim().toLowerCase() : null);

            List<String> validBrands = brand != null ? brand.stream()
                    .filter(b -> b != null && !b.trim().isEmpty())
                    .map(b -> b.trim().toLowerCase())
                    .collect(Collectors.toList()) : java.util.Collections.emptyList();

            List<Integer> validCategories = category != null ? category.stream()
                    .filter(c -> c != null)
                    .collect(Collectors.toList()) : java.util.Collections.emptyList();

            List<Map<String, Object>> productList = allProducts.stream()
                    .filter(p -> p != null)
                    .filter(p -> p.getStatus() == null || p.getStatus() == 1)
                    .filter(p -> p.getCategory() == null || p.getCategory().isActive())
                    .filter(p -> {
                        if (p.getBrandName() != null && !p.getBrandName().trim().isEmpty()) {
                            return activeBrandNamesLower.contains(p.getBrandName().trim().toLowerCase());
                        }
                        return true;
                    })
                    .filter(p -> {
                        if (searchTerm == null) return true;
                        String pName = p.getProductName() != null ? p.getProductName().toLowerCase() : "";
                        String bName = p.getBrandName() != null ? p.getBrandName().toLowerCase() : "";
                        String cName = (p.getCategory() != null && p.getCategory().getName() != null) ? p.getCategory().getName().toLowerCase() : "";
                        return pName.contains(searchTerm) || bName.contains(searchTerm) || cName.contains(searchTerm);
                    })
                    .filter(p -> {
                        if (validBrands.isEmpty()) return true;
                        String bName = p.getBrandName() != null ? p.getBrandName().toLowerCase() : "";
                        return validBrands.contains(bName);
                    })
                    .filter(p -> {
                        if (validCategories.isEmpty()) return true;
                        return p.getCategory() != null && validCategories.contains(p.getCategory().getId());
                    })
                    .map(p -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", p.getId());
                        map.put("product_name", p.getProductName() != null ? p.getProductName() : "");
                        map.put("brand_name", p.getBrandName() != null ? p.getBrandName() : "");

                        String imgUrl = "";
                        if (p.getImages() != null && !p.getImages().isEmpty()) {
                            ProductImage firstImg = p.getImages().stream()
                                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                                    .findFirst()
                                    .orElse(p.getImages().iterator().next());
                            if (firstImg != null && firstImg.getImageUrl() != null) {
                                imgUrl = "/images/" + firstImg.getImageUrl();
                            }
                        }
                        map.put("image_url", imgUrl);

                        Double minPrice = 0.0;
                        if (p.getVariants() != null && !p.getVariants().isEmpty()) {
                            minPrice = p.getVariants().stream()
                                    .filter(v -> v.getPrice() != null)
                                    .mapToDouble(v -> v.getPrice().doubleValue())
                                    .min()
                                    .orElse(0.0);
                        }
                        map.put("min_price", minPrice);
                        return map;
                    })
                    .filter(p -> {
                        Double price = (Double) p.get("min_price");
                        if (min != null && price < min) return false;
                        if (max != null && price > max) return false;
                        return true;
                    })
                    .collect(Collectors.toList());

            if ("price-asc".equalsIgnoreCase(sort) || "price_asc".equalsIgnoreCase(sort)) {
                productList.sort((a, b) -> Double.compare((Double) a.get("min_price"), (Double) b.get("min_price")));
            } else if ("price-desc".equalsIgnoreCase(sort) || "price_desc".equalsIgnoreCase(sort)) {
                productList.sort((a, b) -> Double.compare((Double) b.get("min_price"), (Double) a.get("min_price")));
            } else {
                productList.sort((a, b) -> Integer.compare((Integer) b.get("id"), (Integer) a.get("id")));
            }

            double overallMinPrice = allProducts.stream()
                    .flatMap(p -> p.getVariants() != null ? p.getVariants().stream() : java.util.stream.Stream.empty())
                    .filter(v -> v.getPrice() != null)
                    .mapToDouble(v -> v.getPrice().doubleValue())
                    .min()
                    .orElse(0.0);

            double overallMaxPrice = allProducts.stream()
                    .flatMap(p -> p.getVariants() != null ? p.getVariants().stream() : java.util.stream.Stream.empty())
                    .filter(v -> v.getPrice() != null)
                    .mapToDouble(v -> v.getPrice().doubleValue())
                    .max()
                    .orElse(5000000.0);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("products", productList);
            result.put("brands", activeBrands.stream().map(b -> b.get("name")).collect(Collectors.toList()));
            result.put("categories", activeCategories);
            result.put("min_price", overallMinPrice);
            result.put("max_price", overallMaxPrice);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tải sản phẩm cửa hàng: " + e.getMessage()));
        }
    }

    private String fixColorName(String raw) {
        if (raw == null) return "";
        String clean = raw.trim();
        String lower = clean.toLowerCase();
        switch (lower) {
            case "black": return "Đen";
            case "white": return "Trắng";
            case "red": return "Đỏ";
            case "blue": return "Xanh dương";
            case "green": return "Xanh lá";
            case "yellow": return "Vàng";
            case "pink": return "Hồng";
            case "grey":
            case "gray": return "Xám";
            case "brown": return "Nâu";
            case "navy": return "Xanh navy";
            case "purple": return "Tím";
            case "orange": return "Cam";
            case "beige": return "Kem";
        }
        return clean.replace("Tr?ng", "Trắng")
                    .replace("Đ?", "Đỏ")
                    .replace("Xanh l?", "Xanh lá")
                    .replace("V?ng", "Vàng")
                    .replace("H?ng", "Hồng");
    }
}
