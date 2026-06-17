package com.ShoeStore.controller.admin;

import java.io.File;
import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.ShoeStore.model.*;
import com.ShoeStore.repository.*;

@Controller
@RequestMapping("/admin")
public class AdminProductManager {

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
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private BrandRepository brandRepository;

    private String capitalize(String s) {
        if (s == null || s.trim().isEmpty()) return s;
        s = s.trim();
        if (s.length() <= 1) return s.toUpperCase();
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }

    private void seedColors() {
        // Repair corrupted colors with '?' due to previous encoding/stripping issues
        colorRepository.findAll().forEach(c -> {
            String name = c.getColorName();
            if (name != null) {
                String upper = name.toUpperCase();
                // Match both literal '?' and stripped names from previous error
                if (upper.contains("?") || upper.equals("HNG") || upper.equals("TRNG") || upper.equals("\u0110EN")) {
                    if (upper.startsWith("H")) c.setColorName("H\u1ed3ng");
                    else if (upper.startsWith("TR")) c.setColorName("Tr\u1eafng");
                    else if (upper.startsWith("\u0110") && (upper.contains("?") || upper.length() < 3)) c.setColorName("\u0110\u1ecf");
                    colorRepository.save(c);
                }
            }
        });
        colorRepository.flush();

        String[] allowed = {
            "Tr\u1eafng", // Trắng
            "\u0110en",   // Đen
            "Xanh",       // Xanh
            "\u0110\u1ecf", // Đỏ
            "H\u1ed3ng"   // Hồng
        };
        
        java.util.List<Color> allExisting = colorRepository.findAll();
        java.util.Set<String> normalizedExisting = new java.util.HashSet<>();
        allExisting.forEach(c -> normalizedExisting.add(capitalize(c.getColorName()).toLowerCase()));

        for (String c : allowed) {
            String name = capitalize(c);
            if (!normalizedExisting.contains(name.toLowerCase())) {
                Color color = new Color();
                color.setColorName(name);
                colorRepository.save(color);
                normalizedExisting.add(name.toLowerCase());
            }
        }
        colorRepository.flush();
        
        // Purge unwanted and unused colors
        allExisting = colorRepository.findAll(); // Refresh list
        for (Color c : allExisting) {
            String norm = capitalize(c.getColorName());
            boolean isAllowed = false;
            for (String a : allowed) {
                if (capitalize(a).equalsIgnoreCase(norm)) isAllowed = true;
            }
            if (!isAllowed) {
                java.util.List<ProductVariant> variants = productVariantRepository.findAllByColor(c);
                if (variants.isEmpty()) {
                    try {
                        colorRepository.delete(c);
                    } catch (Exception e) {}
                }
            }
        }
        colorRepository.flush();
    }

    private void consolidateAttributes() {
        // Consolidate Colors by NFKC normalized lower-case name
        java.util.List<Color> allColors = colorRepository.findAll();
        java.util.Map<String, Color> uniqueMap = new java.util.HashMap<>();
        for (Color c : allColors) {
            String rawName = c.getColorName();
            if (rawName == null) {
                colorRepository.delete(c);
                continue;
            }
            String normalizedKey = capitalize(rawName).toLowerCase();
            if (uniqueMap.containsKey(normalizedKey)) {
                Color primary = uniqueMap.get(normalizedKey);
                java.util.List<ProductVariant> variants = productVariantRepository.findAllByColor(c);
                for (ProductVariant v : variants) {
                    v.setColor(primary);
                    productVariantRepository.save(v);
                }
                productVariantRepository.flush(); // FORCE UPDATE in DB before DELETE
                try {
                    colorRepository.delete(c);
                    colorRepository.flush();
                } catch (Exception e) {}
            } else {
                String capitalizedName = capitalize(rawName);
                if (!rawName.equals(capitalizedName)) {
                    c.setColorName(capitalizedName);
                    colorRepository.save(c);
                }
                uniqueMap.put(normalizedKey, c);
            }
        }
        colorRepository.flush();

        // Consolidate Sizes
        java.util.List<Size> allSizes = sizeRepository.findAll();
        java.util.Map<String, Size> uniqueSizeMap = new java.util.HashMap<>();
        for (Size s : allSizes) {
            String rawName = s.getSizeName();
            if (rawName == null) {
                sizeRepository.delete(s);
                continue;
            }
            String normalizedKey = rawName.trim();
            if (uniqueSizeMap.containsKey(normalizedKey)) {
                Size primary = uniqueSizeMap.get(normalizedKey);
                java.util.List<ProductVariant> variants = productVariantRepository.findAllBySize(s);
                for (ProductVariant v : variants) {
                    v.setSize(primary);
                    productVariantRepository.save(v);
                }
                productVariantRepository.flush(); // FORCE UPDATE in DB before DELETE
                try {
                    sizeRepository.delete(s);
                    sizeRepository.flush();
                } catch (Exception e) {}
            } else {
                if (!rawName.equals(normalizedKey)) {
                    s.setSizeName(normalizedKey);
                    sizeRepository.save(s);
                }
                uniqueSizeMap.put(normalizedKey, s);
            }
        }
        sizeRepository.flush();
    }

    private void seedSizes() {
        String[] sizes = {"36", "37", "38", "39", "40", "41", "42", "43", "44", "45"};
        for (String s : sizes) {
            String name = s.trim();
            if (!sizeRepository.findBySizeName(name).isPresent()) {
                Size size = new Size();
                size.setSizeName(name);
                sizeRepository.save(size);
            }
        }
        sizeRepository.flush();
    }

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private void seedData() {
        consolidateAttributes();
        entityManager.flush();
        entityManager.clear();
        seedColors();
        seedSizes();
    }

    @GetMapping("/products")
    public String products() {
        return "admin/products";
    }

    @Transactional
    @GetMapping("/products/create")
    public String showCreateForm(Model model) {
        seedData();

        model.addAttribute("product", new Product());
        model.addAttribute("categories", categoryRepository.findAll());
        // Deduplicate and Sort Sizes
        java.util.List<Size> allSizes = sizeRepository.findAll();
        java.util.Map<String, Size> uniqueSizes = new java.util.LinkedHashMap<>();
        for (Size s : allSizes) uniqueSizes.putIfAbsent(s.getSizeName().trim(), s);
        java.util.List<Size> sortedSizes = new java.util.ArrayList<>(uniqueSizes.values());
        sortedSizes.sort((s1, s2) -> {
            try { return Integer.compare(Integer.parseInt(s1.getSizeName()), Integer.parseInt(s2.getSizeName())); }
            catch (Exception e) { return s1.getSizeName().compareTo(s2.getSizeName()); }
        });
        model.addAttribute("sizes", sortedSizes);

        // Deduplicate and Sort Colors
        java.util.List<Color> allColors = colorRepository.findAll();
        java.util.Map<String, Color> uniqueColors = new java.util.LinkedHashMap<>();
        for (Color c : allColors) {
            String norm = capitalize(c.getColorName());
            if (norm != null && !norm.isEmpty()) {
                uniqueColors.putIfAbsent(norm.toLowerCase().trim(), c);
            }
        }
        java.util.List<Color> sortedColors = new java.util.ArrayList<>(uniqueColors.values());
        sortedColors.sort((c1, c2) -> capitalize(c1.getColorName()).compareToIgnoreCase(capitalize(c2.getColorName())));

        // Final sanity check for UI
        java.util.List<Color> finalColors = new java.util.ArrayList<>();
        java.util.Set<String> seenNames = new java.util.HashSet<>();
        for (Color c : sortedColors) {
            String name = capitalize(c.getColorName()).toLowerCase().trim();
            if (seenNames.add(name)) {
                finalColors.add(c);
            }
        }
        model.addAttribute("colors", finalColors);

        model.addAttribute("brands", brandRepository.findAll());

        return "admin/product-form";
    }

    @Transactional
    @PostMapping("/products/save")
    public String saveProduct(
            @ModelAttribute("product") Product product,
            @RequestParam(value = "imageBase64", required = false) String imageBase64,
            @RequestParam(value = "sizeId", required = false) Integer sizeId,
            @RequestParam(value = "colorId", required = false) Integer colorId,
            @RequestParam(value = "newColorName", required = false) String newColorName,
            @RequestParam(value = "price", required = false) BigDecimal price,
            @RequestParam(value = "quantity", required = false) Integer quantity,
            @RequestParam(value = "brandName", required = false) String brandName,
            RedirectAttributes redirectAttributes) {

        try {

            // ================= THƯƠNG HIỆU =================
            if (brandName != null && !brandName.isEmpty()) {
                product.setBrandName(brandName);
            }

            // ================= SKU =================
            if (product.getProductCode() == null || product.getProductCode().isEmpty()) {
                product.setProductCode("PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            }

            // ================= STATUS =================
            if (product.getStatus() == null) {
                product.setStatus(1);
            }

            // ================= SAVE PRODUCT =================
            Product savedProduct = productRepository.save(product);

            // ================= SAVE IMAGE =================
            if (imageBase64 != null && !imageBase64.isEmpty()) {

                String base64Data = imageBase64.contains(",")
                        ? imageBase64.split(",")[1]
                        : imageBase64;

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

            // ================= COLOR MỚI =================
            if (newColorName != null && !newColorName.trim().isEmpty()) {
                Color newColor = new Color();
                newColor.setColorName(newColorName);

                colorRepository.save(newColor);

                colorId = newColor.getId();
            }

            // ================= SAVE VARIANT =================
            if (sizeId != null && colorId != null && price != null && quantity != null) {

                Size size = sizeRepository.findById(sizeId).orElse(null);
                Color color = colorRepository.findById(colorId).orElse(null);

                if (size != null && color != null) {

                    ProductVariant variant = productVariantRepository
                            .findByProductAndSizeAndColor(savedProduct, size, color)
                            .orElse(new ProductVariant());

                    variant.setProduct(savedProduct);
                    variant.setSize(size);
                    variant.setColor(color);
                    variant.setPrice(price);
                    variant.setQuantity(quantity);
                    variant.setStatus(1);

                    productVariantRepository.save(variant);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            redirectAttributes.addFlashAttribute("error", "Có lỗi xảy ra: " + e.getMessage());
        }

        redirectAttributes.addFlashAttribute("success", "Lưu thông tin sản phẩm thành công! Bây giờ hãy thêm các thuộc tính như Size và Màu sắc.");
        return "redirect:/admin/products/detail/" + product.getId();
    }

    @Transactional
    @GetMapping("/products/edit/{id}")
    public String showEditForm(@PathVariable Integer id, Model model) {
        seedData();
        Product product = productRepository.findById(id).orElse(null);
        if (product != null) {
            product.getVariants().size(); // Eagerly initialize
            product.getImages().size();   // Eagerly initialize
        }
        model.addAttribute("product", product);
        model.addAttribute("categories", categoryRepository.findAll());
        model.addAttribute("brands", brandRepository.findAll());

        // Deduplicate and Sort Sizes
        java.util.List<Size> allSizes = sizeRepository.findAll();
        java.util.Map<String, Size> uniqueSizes = new java.util.LinkedHashMap<>();
        for (Size s : allSizes) uniqueSizes.putIfAbsent(s.getSizeName().trim(), s);
        java.util.List<Size> sortedSizes = new java.util.ArrayList<>(uniqueSizes.values());
        sortedSizes.sort((s1, s2) -> {
            try { return Integer.compare(Integer.parseInt(s1.getSizeName()), Integer.parseInt(s2.getSizeName())); }
            catch (Exception e) { return s1.getSizeName().compareTo(s2.getSizeName()); }
        });
        model.addAttribute("sizes", sortedSizes);

        // Deduplicate and Sort Colors
        java.util.List<Color> allColors = colorRepository.findAll();
        java.util.Map<String, Color> uniqueColors = new java.util.LinkedHashMap<>();
        for (Color c : allColors) {
            String norm = capitalize(c.getColorName());
            if (norm != null && !norm.isEmpty()) {
                uniqueColors.putIfAbsent(norm.toLowerCase().trim(), c);
            }
        }
        java.util.List<Color> sortedColors = new java.util.ArrayList<>(uniqueColors.values());
        sortedColors.sort((c1, c2) -> capitalize(c1.getColorName()).compareToIgnoreCase(capitalize(c2.getColorName())));

        // Final sanity check for UI
        java.util.List<Color> finalColors = new java.util.ArrayList<>();
        java.util.Set<String> seenNames = new java.util.HashSet<>();
        for (Color c : sortedColors) {
            String name = capitalize(c.getColorName()).toLowerCase().trim();
            if (seenNames.add(name)) {
                finalColors.add(c);
            }
        }
        model.addAttribute("colors", finalColors);

        return "admin/product-form";
    }

    @Transactional
    @GetMapping("/products/detail/{id}")
    public String productDetails(@PathVariable Integer id, Model model) {
        seedData();
        Product product = productRepository.findById(id).orElse(null);
        if (product != null) {
            // Eagerly initialize collections to prevent LazyInitializationException in Thymeleaf
            product.getVariants().size(); 
            product.getImages().size();
        }
        model.addAttribute("product", product);

        // Deduplicate and Sort Sizes (UI Level Protection)
        java.util.List<Size> allSizes = sizeRepository.findAll();
        java.util.Map<String, Size> uniqueSizes = new java.util.LinkedHashMap<>();
        for (Size s : allSizes) uniqueSizes.putIfAbsent(s.getSizeName().trim(), s);
        java.util.List<Size> sortedSizes = new java.util.ArrayList<>(uniqueSizes.values());
        sortedSizes.sort((s1, s2) -> {
            try { return Integer.compare(Integer.parseInt(s1.getSizeName()), Integer.parseInt(s2.getSizeName())); }
            catch (Exception e) { return s1.getSizeName().compareTo(s2.getSizeName()); }
        });
        model.addAttribute("sizes", sortedSizes);

        // Deduplicate and Sort Colors (UI Level Protection)
        java.util.List<Color> allColors = colorRepository.findAll();
        java.util.Map<String, Color> uniqueColors = new java.util.LinkedHashMap<>();
        for (Color c : allColors) {
            String norm = capitalize(c.getColorName());
            if (norm != null && !norm.isEmpty()) {
                uniqueColors.putIfAbsent(norm.toLowerCase().trim(), c);
            }
        }
        java.util.List<Color> sortedColors = new java.util.ArrayList<>(uniqueColors.values());
        sortedColors.sort((c1, c2) -> capitalize(c1.getColorName()).compareToIgnoreCase(capitalize(c2.getColorName())));
        
        // Final sanity check for UI
        java.util.List<Color> finalColors = new java.util.ArrayList<>();
        java.util.Set<String> seenNames = new java.util.HashSet<>();
        for (Color c : sortedColors) {
            String name = capitalize(c.getColorName()).toLowerCase().trim();
            if (seenNames.add(name)) {
                finalColors.add(c);
            }
        }
        model.addAttribute("colors", finalColors);

        return "admin/product-details";
    }

    @Transactional
    @PostMapping("/products/variant/save")
    public String saveVariant(
            @RequestParam(value = "productId", required = false) Integer productId,
            @RequestParam(value = "variantId", required = false) Integer variantId,
            @RequestParam(value = "sizeId", required = false) Integer sizeId,
            @RequestParam(value = "colorId", required = false) Integer colorId,
            @RequestParam(value = "newColorName", required = false) String newColorName,
            @RequestParam(value = "newSizeName", required = false) String newSizeName,
            @RequestParam(value = "price", required = false) BigDecimal price,
            @RequestParam(value = "quantity", required = false) Integer quantity,
            RedirectAttributes redirectAttributes) {

        if (productId == null) return "redirect:/admin/products";
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return "redirect:/admin/products";

        try {
            // Normalize and Validate NEW COLOR
            if (newColorName != null && !newColorName.trim().isEmpty()) {
                String normalized = capitalize(newColorName);
                if (normalized.matches(".*\\d.*")) {
                    redirectAttributes.addFlashAttribute("error", "Tên màu không được chứa số!");
                    return "redirect:/admin/products/detail/" + productId;
                }
                if (normalized.length() < 2 || normalized.length() > 50) {
                    redirectAttributes.addFlashAttribute("error", "Tên màu phải từ 2 đến 50 ký tự!");
                    return "redirect:/admin/products/detail/" + productId;
                }
                
                // Check if already exists
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

            // Normalize and Validate NEW SIZE
            if (newSizeName != null && !newSizeName.trim().isEmpty()) {
                String normalized = newSizeName.trim();
                if (!normalized.matches("^\\d+$")) {
                    redirectAttributes.addFlashAttribute("error", "Kích cỡ phải là số (không được chứa chữ)! Chi tiết: " + normalized);
                    return "redirect:/admin/products/detail/" + productId;
                }
                try {
                    int sVal = Integer.parseInt(normalized);
                    if (sVal < 1 || sVal > 99) {
                        redirectAttributes.addFlashAttribute("error", "Kích cỡ phải từ 1 đến 99!");
                        return "redirect:/admin/products/detail/" + productId;
                    }
                } catch (Exception e) {
                    redirectAttributes.addFlashAttribute("error", "Kích cỡ không hợp lệ!");
                    return "redirect:/admin/products/detail/" + productId;
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

            // Final validation of IDs
            if ((sizeId == null || sizeId == -1) || (colorId == null || colorId == -1)) {
                redirectAttributes.addFlashAttribute("error", "Vui lòng chọn hoặc nhập đầy đủ thông tin!");
                return "redirect:/admin/products/detail/" + productId;
            }

            if (price == null || price.compareTo(new java.math.BigDecimal(5000)) <= 0) {
                redirectAttributes.addFlashAttribute("error", "Giá bán phải lớn hơn 5,000 VNĐ!");
                return "redirect:/admin/products/detail/" + productId;
            }
            if (quantity == null || quantity < 0) {
                redirectAttributes.addFlashAttribute("error", "Số lượng không được âm!");
                return "redirect:/admin/products/detail/" + productId;
            }

            Size size = sizeRepository.findById(sizeId).orElse(null);
            Color color = colorRepository.findById(colorId).orElse(null);

            if (size != null && color != null) {
                ProductVariant variant;
                if (variantId == null) {
                    // ADD NEW: Check for duplicate first
                    java.util.Optional<ProductVariant> duplicate = productVariantRepository.findByProductAndSizeAndColor(product, size, color);
                    if (duplicate.isPresent()) {
                        redirectAttributes.addFlashAttribute("error", "Lỗi: Sản phẩm đã có biến thể Size " + size.getSizeName() + " - Màu " + color.getColorName() + "!");
                        return "redirect:/admin/products/detail/" + productId;
                    }
                    variant = new ProductVariant();
                } else {
                    // EDIT: Check if new combination clashes with another existing variant
                    variant = productVariantRepository.findById(variantId).orElse(null);
                    if (variant == null) return "redirect:/admin/products/detail/" + productId;

                    java.util.Optional<ProductVariant> clash = productVariantRepository.findByProductAndSizeAndColor(product, size, color);
                    if (clash.isPresent() && !clash.get().getId().equals(variantId)) {
                        redirectAttributes.addFlashAttribute("error", "Lỗi: Size " + size.getSizeName() + " - Màu " + color.getColorName() + " đã được dùng cho biến thể khác!");
                        return "redirect:/admin/products/detail/" + productId;
                    }
                }

                if (quantity == null || quantity < 1 || quantity > 100) {
                    redirectAttributes.addFlashAttribute("error", "Lỗi: Số lượng tồn kho phải lớn hơn hoặc bằng 1 và không vượt quá 100!");
                    return "redirect:/admin/products/detail/" + productId;
                }

                variant.setProduct(product);
                variant.setSize(size);
                variant.setColor(color);
                variant.setPrice(price);
                variant.setQuantity(quantity);
                variant.setStatus(1);

                productVariantRepository.save(variant);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "redirect:/admin/products/detail/" + productId;
    }

    @Transactional
    @GetMapping("/products/variant/delete/{variantId}/{productId}")
    public String deleteVariant(@PathVariable Integer variantId, @PathVariable Integer productId, RedirectAttributes redirectAttributes) {
        try {
            // 1. Check if this variant is in any existing orders
            if (productVariantRepository.countOrderItemsByVariantId(variantId) > 0) {
                redirectAttributes.addFlashAttribute("error", "Không thể xóa biến thể này vì đã có khách hàng đặt mua (dữ liệu hóa đơn)!");
                return "redirect:/admin/products/detail/" + productId;
            }

            // 2. Safe to delete: First clear from cart items
            productVariantRepository.deleteRelatedCartItems(variantId);
            
            // 3. Delete the variant itself
            productVariantRepository.deleteById(variantId);
            
            redirectAttributes.addFlashAttribute("success", "Đã xóa biến thể thành công!");
        } catch (Exception e) {
            e.printStackTrace();
            redirectAttributes.addFlashAttribute("error", "Có lỗi xảy ra: " + e.getMessage());
        }
        return "redirect:/admin/products/detail/" + productId;
    }

    @Transactional
    @GetMapping("/products/delete/{id}")
    public String deleteProduct(@PathVariable Integer id) {

        productRepository.deleteRelatedCartItems(id);
        productRepository.deleteRelatedOrderItems(id);
        productRepository.deleteRelatedFavourites(id);
        productRepository.deleteRelatedReviews(id);
        productRepository.deleteRelatedImages(id);
        productRepository.deleteRelatedVariants(id);

        productRepository.deleteById(id);

        return "redirect:/admin/products";
    }
}