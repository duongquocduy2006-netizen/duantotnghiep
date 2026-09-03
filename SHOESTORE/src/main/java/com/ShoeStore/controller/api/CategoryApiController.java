package com.ShoeStore.controller.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ShoeStore.model.Category;
import com.ShoeStore.repository.CategoryRepository;
import com.ShoeStore.repository.ProductRepository;

@RestController
@RequestMapping("/api/categories")
public class CategoryApiController {

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private ProductRepository productRepo;

    // 1. Lấy toàn bộ danh mục (GET)
    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepo.findAll();
    }

    // 2. Lấy một danh mục theo ID (GET)
    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Integer id) {
        return categoryRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Thêm mới danh mục (POST)
    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Tên danh mục không được để trống!\"}");
        }
        String cleanName = category.getName().trim();
        boolean exists = categoryRepo.findAll().stream()
                .anyMatch(c -> c.getName() != null && c.getName().trim().equalsIgnoreCase(cleanName));
        if (exists) {
            return ResponseEntity.badRequest().body("{\"error\": \"Tên danh mục '" + cleanName + "' đã tồn tại! Vui lòng nhập tên khác.\"}");
        }

        category.setName(cleanName);
        if (category.getSlug() == null || category.getSlug().isBlank()) {
            category.setSlug(generateSlug(cleanName));
        }
        try {
            Category saved = categoryRepo.save(category);
            return ResponseEntity.ok(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body("{\"error\": \"Đường dẫn (Slug) này đã tồn tại! Vui lòng nhập tay Slug khác.\"}");
        }
    }

    // 4. Cập nhật danh mục (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Integer id, @RequestBody Category categoryDetails) {
        return categoryRepo.findById(id).map(category -> {
            if (categoryDetails.getName() != null) {
                String cleanName = categoryDetails.getName().trim();
                if (cleanName.isEmpty()) {
                    return ResponseEntity.badRequest().body("{\"error\": \"Tên danh mục không được để trống!\"}");
                }
                boolean exists = categoryRepo.findAll().stream()
                        .anyMatch(c -> c.getName() != null && !c.getId().equals(id) && c.getName().trim().equalsIgnoreCase(cleanName));
                if (exists) {
                    return ResponseEntity.badRequest().body("{\"error\": \"Tên danh mục '" + cleanName + "' đã bị trùng lặp!\"}");
                }
                category.setName(cleanName);
            }

            category.setActive(categoryDetails.isActive()); 
            
            if (categoryDetails.getSlug() != null && !categoryDetails.getSlug().isBlank()) {
                category.setSlug(categoryDetails.getSlug());
            } else if (category.getName() != null) {
                category.setSlug(generateSlug(category.getName()));
            }
            
            try {
                Category updated = categoryRepo.save(category);
                return ResponseEntity.ok(updated);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                return ResponseEntity.badRequest().body("{\"error\": \"Đường dẫn (Slug) này đã bị trùng lặp!\"}");
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // 5. Xóa danh mục (DELETE)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Integer id) {
        if (productRepo.existsByCategoryId(id)) {
            // Trả về mã lỗi 400 Bad Request kèm thông báo
            return ResponseEntity.badRequest().body("{\"error\": \"Không thể xóa danh mục này vì vẫn còn sản phẩm đang thuộc danh mục này!\"}");
        }
        return categoryRepo.findById(id).map(category -> {
            categoryRepo.delete(category);
            return ResponseEntity.ok("{\"message\": \"Xóa thành công!\"}");
        }).orElse(ResponseEntity.notFound().build());
    }

    // Hàm tiện ích tạo Slug tử động từ Tên
    private String generateSlug(String name) {
        if(name == null) return "";
        return name.toLowerCase()
            .replaceAll("[áàảãạăắằẳẵặâấầẩẫậ]", "a")
            .replaceAll("[éèẻẽẹêếềểễệ]", "e")
            .replaceAll("[íìỉĩị]", "i")
            .replaceAll("[óòỏõọôốồổỗộơớờởỡợ]", "o")
            .replaceAll("[úùủũụưứừửữự]", "u")
            .replaceAll("[ýỳỷỹỵ]", "y")
            .replaceAll("đ", "d")
            .replaceAll("[^a-z0-9\\s]", "")
            .replaceAll("\\s+", "-")
            .trim();
    }
}
