package com.ShoeStore.controller.api;

import com.ShoeStore.service.FlashSaleService;
import com.ShoeStore.model.FlashSale;
import com.ShoeStore.model.FlashSaleProduct;
import com.ShoeStore.model.Product;
import com.ShoeStore.repository.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/flash-sales")
public class FlashSaleApiController {

    @Autowired
    private FlashSaleService flashSaleService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private com.ShoeStore.repository.ProductVariantRepository productVariantRepository;

    @Autowired
    private com.ShoeStore.repository.FlashSaleRepository flashSaleRepository;

    @Autowired
    private com.ShoeStore.repository.BrandRepository brandRepository;

    // 1. GET ACTIVE CAMPAIGN FOR CLIENT FRONTEND
    @GetMapping("/active")
    public ResponseEntity<?> getActiveFlashSale() {
        try {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            List<FlashSale> activeOrUpcomingSales = flashSaleRepository.findActiveOrUpcomingFlashSales(now);

            if (activeOrUpcomingSales.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "hasActiveCampaign", false,
                        "campaigns", List.of(),
                        "message", "Hiện tại không có chương trình Flash Sale nào đang diễn ra."));
            }

            java.util.Set<String> activeBrandNamesLower = brandRepository.findAll().stream()
                    .filter(com.ShoeStore.model.Brand::isActive)
                    .map(b -> b.getName() != null ? b.getName().trim().toLowerCase() : "")
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());

            List<Map<String, Object>> campaignsMapList = new ArrayList<>();

            for (FlashSale fs : activeOrUpcomingSales) {
                boolean isLive = (now.isAfter(fs.getStartDate()) || now.isEqual(fs.getStartDate())) && (now.isBefore(fs.getEndDate()) || now.isEqual(fs.getEndDate()));
                boolean isUpcoming = now.isBefore(fs.getStartDate());

                Map<String, Object> campaignMap = new HashMap<>();
                campaignMap.put("id", fs.getId());
                campaignMap.put("name", fs.getName());
                campaignMap.put("startDate", fs.getStartDate());
                campaignMap.put("endDate", fs.getEndDate());
                campaignMap.put("isLive", isLive);
                campaignMap.put("isUpcoming", isUpcoming);

                List<FlashSaleProduct> flashProducts = flashSaleService.getProductsByFlashSaleId(fs.getId());
                List<Map<String, Object>> productsMap = flashProducts.stream()
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
                    fMap.put("quantityLimit", fsp.getQuantityLimit());
                    fMap.put("soldQuantity", fsp.getSoldQuantity());

                    Map<String, Object> pMap = new HashMap<>();
                    var p = fsp.getProduct();
                    pMap.put("id", p.getId());
                    pMap.put("productName", p.getProductName());
                    pMap.put("brandName", p.getBrandName());

                    String mainImg = "";
                    if (p.getImages() != null && !p.getImages().isEmpty()) {
                        mainImg = "/images/" + p.getImages().iterator().next().getImageUrl();
                    }
                    pMap.put("imageUrl", mainImg);

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

                campaignMap.put("products", productsMap);
                campaignsMapList.add(campaignMap);
            }

            Map<String, Object> firstCampaign = campaignsMapList.get(0);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasActiveCampaign", true);
            response.put("campaign", firstCampaign);
            response.put("products", firstCampaign.get("products"));
            response.put("campaigns", campaignsMapList);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi tải thông tin Flash Sale: " + e.getMessage()));
        }
    }

    // 2. LIST ALL CAMPAIGNS FOR ADMIN FRONTEND
    @GetMapping
    public ResponseEntity<?> getAllFlashSales() {
        try {
            List<FlashSale> list = flashSaleService.getAllFlashSales();
            List<Map<String, Object>> response = list.stream().map(fs -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", fs.getId());
                map.put("name", fs.getName());
                map.put("startDate", fs.getStartDate());
                map.put("endDate", fs.getEndDate());
                map.put("status", fs.getStatus());
                map.put("productCount", fs.getFlashSaleProducts() != null ? fs.getFlashSaleProducts().size() : 0);
                return map;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // 3. GET FLASH SALE BY ID FOR ADMIN FORMS
    @GetMapping("/{id}")
    public ResponseEntity<?> getFlashSaleById(@PathVariable Integer id) {
        try {
            Optional<FlashSale> fsOpt = flashSaleService.getFlashSaleById(id);
            if (fsOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Không tìm thấy chiến dịch Flash Sale!"));
            }
            FlashSale fs = fsOpt.get();
            Map<String, Object> map = new HashMap<>();
            map.put("id", fs.getId());
            map.put("name", fs.getName());
            map.put("startDate", fs.getStartDate());
            map.put("endDate", fs.getEndDate());
            map.put("status", fs.getStatus());

            List<Map<String, Object>> productsList = fs.getFlashSaleProducts().stream().map(fsp -> {
                Map<String, Object> pMap = new HashMap<>();
                pMap.put("id", fsp.getId());
                pMap.put("productId", fsp.getProduct() != null ? fsp.getProduct().getId() : null);
                pMap.put("productName", fsp.getProduct() != null ? fsp.getProduct().getProductName() : "");
                
                if (fsp.getProductVariant() != null) {
                    pMap.put("variantId", fsp.getProductVariant().getId());
                    String vName = "";
                    if (fsp.getProductVariant().getColor() != null) vName += fsp.getProductVariant().getColor().getColorName();
                    if (fsp.getProductVariant().getSize() != null) vName += " - " + fsp.getProductVariant().getSize().getSizeName();
                    pMap.put("variantName", vName);
                } else {
                    pMap.put("variantId", null);
                    pMap.put("variantName", "Tất cả biến thể");
                }
                
                pMap.put("salePrice", fsp.getSalePrice());
                pMap.put("quantityLimit", fsp.getQuantityLimit());
                pMap.put("soldQuantity", fsp.getSoldQuantity());
                return pMap;
            }).collect(Collectors.toList());

            map.put("flashSaleProducts", productsList);
            return ResponseEntity.ok(Map.of("success", true, "flashSale", map));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // 4. DELETE FLASH SALE BY ID
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteFlashSale(@PathVariable Integer id) {
        try {
            flashSaleService.deleteFlashSale(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa chiến dịch Flash Sale thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // 5. CREATE OR UPDATE FLASH SALE
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveFlashSale(@RequestBody Map<String, Object> payload) {
        try {
            Integer id = null;
            if (payload.get("id") != null) {
                id = Integer.parseInt(payload.get("id").toString());
            }

            String name = (String) payload.get("name");
            String startDateStr = (String) payload.get("startDate");
            String endDateStr = (String) payload.get("endDate");
            Object statusObj = payload.get("status");
            Integer status = (statusObj != null) ? Integer.parseInt(statusObj.toString()) : 1;

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Tên chương trình không được trống!"));
            }

            FlashSale flashSale = new FlashSale();
            flashSale.setId(id);
            flashSale.setName(name);

            if (startDateStr != null && startDateStr.length() == 16)
                startDateStr += ":00";
            if (endDateStr != null && endDateStr.length() == 16)
                endDateStr += ":00";

            java.time.LocalDateTime start = java.time.LocalDateTime.parse(startDateStr);
            java.time.LocalDateTime end = java.time.LocalDateTime.parse(endDateStr);

            java.time.LocalDateTime now = java.time.LocalDateTime.now();

            if (id == null && start.isBefore(now.minusMinutes(5))) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Thời gian bắt đầu không được nằm trong quá khứ!"));
            }

            if (!end.isAfter(start)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Thời gian kết thúc phải sau thời gian bắt đầu!"));
            }

            // 1. Kiểm tra trùng lặp thời gian với các chiến dịch Flash Sale khác (status = 1)
            if (status == 1) {
                List<FlashSale> overlaps = flashSaleRepository.findOverlappingFlashSales(start, end, id);
                if (!overlaps.isEmpty()) {
                    FlashSale existing = overlaps.get(0);
                    String existingStartStr = existing.getStartDate().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));
                    String existingEndStr = existing.getEndDate().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", 
                                "Trong cùng một thời điểm không được có hai chương trình Flash Sale cùng lúc! Chiến dịch '" 
                                + existing.getName() + "' (#" + existing.getId() + ") diễn ra từ " 
                                + existingStartStr + " đến " + existingEndStr + "."));
                }
            }

            flashSale.setStartDate(start);
            flashSale.setEndDate(end);
            flashSale.setStatus(status);

            List<Map<String, Object>> fspList = (List<Map<String, Object>>) payload.get("flashSaleProducts");
            List<FlashSaleProduct> products = new ArrayList<>();

            if (fspList != null) {
                for (Map<String, Object> fspMap : fspList) {
                    Integer prodId = Integer.parseInt(fspMap.get("productId").toString());
                    java.math.BigDecimal salePrice = new java.math.BigDecimal(fspMap.get("salePrice").toString());
                    Integer qtyLimit = Integer.parseInt(fspMap.get("quantityLimit").toString());

                    Product product = productRepository.findById(prodId).orElse(null);
                    if (product != null) {
                        FlashSaleProduct fsp = new FlashSaleProduct();
                        if (fspMap.get("id") != null && !fspMap.get("id").toString().contains(".")) {
                            try {
                                fsp.setId(Integer.parseInt(fspMap.get("id").toString()));
                            } catch (Exception e) {
                            }
                        }
                        fsp.setProduct(product);
                        
                        if (fspMap.get("variantId") != null && !fspMap.get("variantId").toString().isEmpty() && !fspMap.get("variantId").toString().equals("null")) {
                            try {
                                Integer vId = Integer.parseInt(fspMap.get("variantId").toString());
                                com.ShoeStore.model.ProductVariant pv = productVariantRepository.findById(vId).orElse(null);
                                fsp.setProductVariant(pv);
                            } catch (Exception e) {}
                        } else {
                            fsp.setProductVariant(null);
                        }

                        // 2. Kiểm tra giá sale không được lớn hơn hoặc bằng giá gốc
                        java.math.BigDecimal origPrice = null;
                        if (fsp.getProductVariant() != null && fsp.getProductVariant().getPrice() != null) {
                            origPrice = fsp.getProductVariant().getPrice();
                        } else if (product.getVariants() != null && !product.getVariants().isEmpty()) {
                            origPrice = product.getVariants().stream()
                                    .map(com.ShoeStore.model.ProductVariant::getPrice)
                                    .filter(p -> p != null)
                                    .min(java.math.BigDecimal::compareTo)
                                    .orElse(null);
                        }

                        if (origPrice != null && salePrice.compareTo(origPrice) >= 0) {
                            String pName = product.getProductName();
                            if (fsp.getProductVariant() != null) {
                                String vDetail = "";
                                if (fsp.getProductVariant().getColor() != null) vDetail += fsp.getProductVariant().getColor().getColorName();
                                if (fsp.getProductVariant().getSize() != null) vDetail += " - " + fsp.getProductVariant().getSize().getSizeName();
                                pName += " (" + vDetail + ")";
                            }
                            return ResponseEntity.badRequest().body(Map.of(
                                "success", false,
                                "message", "Giá Flash Sale (" + new java.text.DecimalFormat("#,###").format(salePrice) + "đ) của sản phẩm '" 
                                        + pName + "' không được lớn hơn hoặc bằng giá gốc (" + new java.text.DecimalFormat("#,###").format(origPrice) + "đ)!"
                            ));
                        }

                        fsp.setSalePrice(salePrice);
                        fsp.setQuantityLimit(qtyLimit);
                        fsp.setSoldQuantity(fspMap.get("soldQuantity") != null
                                ? Integer.parseInt(fspMap.get("soldQuantity").toString())
                                : 0);
                        fsp.setFlashSale(flashSale);
                        products.add(fsp);
                    }
                }
            }

            flashSale.setFlashSaleProducts(products);
            FlashSale saved = flashSaleService.saveFlashSale(flashSale);

            return ResponseEntity.ok(
                    Map.of("success", true, "id", saved.getId(), "message", "Lưu chiến dịch Flash Sale thành công!"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi lưu chiến dịch: " + e.getMessage()));
        }
    }
}
