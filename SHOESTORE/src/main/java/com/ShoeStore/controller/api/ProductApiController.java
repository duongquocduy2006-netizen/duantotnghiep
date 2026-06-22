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

    // 2. LẤY CHI TIẾT SẢN PHẨM DÀNH CHO ADMIN
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductDetail(@PathVariable Integer id) {
        java.util.Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Không tìm thấy sản phẩm!"));
        }

        Product product = productOpt.get();

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

        // Map variants
        List<Map<String, Object>> variantsList = product.getVariants().stream().map(v -> {
            Map<String, Object> vMap = new HashMap<>();
            vMap.put("id", v.getId());
            vMap.put("sizeId", v.getSize() != null ? v.getSize().getId() : null);
            vMap.put("sizeName", v.getSize() != null ? v.getSize().getSizeName() : "");
            vMap.put("colorId", v.getColor() != null ? v.getColor().getId() : null);
            vMap.put("colorName", v.getColor() != null ? v.getColor().getColorName() : "");
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
            cMap.put("colorName", c.getColorName());
            return cMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "product", prodMap,
                "variants", variantsList,
                "images", imagesList,
                "categories", categories,
                "brands", brands,
                "sizes", sizes,
                "colors", colors));
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

            if (categoryId != null) {
                Category cat = categoryRepository.findById(categoryId).orElse(null);
                product.setCategory(cat);
            }

            Product savedProduct = productRepository.save(product);

            // Xử lý lưu ảnh Base64
            if (imageBase64 != null && !imageBase64.isEmpty()) {
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

            if (productId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu productId!"));
            }

            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Không tìm thấy sản phẩm!"));
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

            if (quantity == null || quantity < 1 || quantity > 100) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Số lượng tồn kho phải từ 1 đến 100!"));
            }

            Size size = sizeRepository.findById(sizeId).orElse(null);
            Color color = colorRepository.findById(colorId).orElse(null);

            if (size == null || color == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Size hoặc Màu không hợp lệ!"));
            }

            ProductVariant variant;
            if (variantId == null) {
                // ADD NEW: Check for duplicate
                java.util.Optional<ProductVariant> duplicate = productVariantRepository
                        .findByProductAndSizeAndColor(product, size, color);
                if (duplicate.isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "Lỗi: Sản phẩm đã có biến thể Size " + size.getSizeName() + " - Màu " + color.getColorName()
                                    + "!"));
                }
                variant = new ProductVariant();
            } else {
                // EDIT
                variant = productVariantRepository.findById(variantId).orElse(null);
                if (variant == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Không tìm thấy biến thể chỉnh sửa!"));
                }

                java.util.Optional<ProductVariant> clash = productVariantRepository
                        .findByProductAndSizeAndColor(product, size, color);
                if (clash.isPresent() && !clash.get().getId().equals(variantId)) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                            "Lỗi: Size " + size.getSizeName() + " - Màu " + color.getColorName()
                                    + " đã được dùng cho biến thể khác!"));
                }
            }

            variant.setProduct(product);
            variant.setSize(size);
            variant.setColor(color);
            variant.setPrice(price);
            variant.setQuantity(quantity);
            variant.setStatus(1);

            productVariantRepository.save(variant);

            return ResponseEntity.ok(Map.of("success", true, "message", "Lưu biến thể thành công!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu biến thể: " + e.getMessage()));
        }
    }

    // 5. XÓA BIẾN THỂ CỦA SẢN PHẨM
    @DeleteMapping("/variant/{variantId}")
    @Transactional
    public ResponseEntity<?> deleteVariant(@PathVariable Integer variantId) {
        try {
            // 1. Kiểm tra xem biến thể có được đặt trong hóa đơn nào chưa
            if (productVariantRepository.countOrderItemsByVariantId(variantId) > 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message",
                        "Không thể xóa biến thể này vì đã có khách hàng đặt mua (dữ liệu hóa đơn)!"));
            }

            // 2. Xóa khỏi giỏ hàng trước
            productVariantRepository.deleteRelatedCartItems(variantId);

            // 3. Xóa biến thể
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
                    " AND fsp.sold_quantity < fsp.quantity_limit) as sale_price " +
                    "FROM products p " +
                    "LEFT JOIN categories c ON p.category_id = c.id " +
                    "WHERE p.status = 1 AND c.status = 1 " +
                    "AND EXISTS (SELECT 1 FROM brands b WHERE b.brand_name = p.brand_name AND b.status = 1) " +
                    "AND p.created_at >= DATEADD(day, -3, GETDATE()) " +
                    "AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.quantity > 0) " +
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

            // Xây dựng câu lệnh SQL truy vấn động
            StringBuilder sql = new StringBuilder();
            sql.append("SELECT p.id, p.product_name, p.brand_name, ")
                    .append("(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, ")
                    .append("(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price ")
                    .append("FROM products p ")
                    .append("LEFT JOIN categories c ON p.category_id = c.id ")
                    .append("WHERE p.status = 1 AND c.status = 1 ")
                    .append("AND EXISTS (SELECT 1 FROM brands b WHERE b.brand_name = p.brand_name AND b.status = 1) ")
                    .append("AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.quantity > 0) ");

            List<Object> params = new java.util.ArrayList<>();

            String searchTerm = keyword != null ? keyword : q;
            // Lọc theo từ khóa (Tên sản phẩm, thương hiệu hoặc danh mục) - Smart Search
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                String[] words = searchTerm.trim().split("\\s+");
                for (String word : words) {
                    String term = "%" + word + "%";
                    sql.append("AND (p.product_name LIKE ? OR p.brand_name LIKE ? OR c.category_name LIKE ?) ");
                    params.add(term);
                    params.add(term);
                    params.add(term);
                }
            }

            // Lọc theo Thương hiệu (IN)
            if (brand != null && !brand.isEmpty()) {
                sql.append("AND p.brand_name IN (");
                for (int i = 0; i < brand.size(); i++) {
                    sql.append("?");
                    params.add(brand.get(i));
                    if (i < brand.size() - 1) {
                        sql.append(",");
                    }
                }
                sql.append(") ");
            }

            // Lọc theo Danh mục (IN)
            if (category != null && !category.isEmpty()) {
                sql.append("AND p.category_id IN (");
                for (int i = 0; i < category.size(); i++) {
                    sql.append("?");
                    params.add(category.get(i));
                    if (i < category.size() - 1) {
                        sql.append(",");
                    }
                }
                sql.append(") ");
            }

            // Lọc theo khoảng giá
            if (min != null) {
                sql.append("AND (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) >= ? ");
                params.add(min);
            }
            if (max != null) {
                sql.append("AND (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) <= ? ");
                params.add(max);
            }

            // Sắp xếp
            if ("price-asc".equalsIgnoreCase(sort)) {
                sql.append("ORDER BY (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) ASC");
            } else if ("price-desc".equalsIgnoreCase(sort)) {
                sql.append("ORDER BY (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) DESC");
            } else {
                sql.append("ORDER BY p.created_at DESC");
            }

            List<Map<String, Object>> products = jdbc.queryForList(sql.toString(), params.toArray());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("products", products);
            result.put("brands", activeBrands.stream().map(b -> b.get("name")).collect(Collectors.toList()));
            result.put("categories", activeCategories);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tải sản phẩm cửa hàng: " + e.getMessage()));
        }
    }
}
