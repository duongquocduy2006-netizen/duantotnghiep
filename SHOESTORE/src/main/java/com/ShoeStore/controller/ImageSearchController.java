package com.ShoeStore.controller;

import com.ShoeStore.service.ImageEmbeddingService;
import com.ShoeStore.service.ImageSearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class ImageSearchController {

    @Autowired
    private ImageSearchService imageSearchService;

    @Autowired
    private ImageEmbeddingService imageEmbeddingService;

    /**
     * POST /api/image-search
     * Upload ảnh → Trả về Top 5 sản phẩm tương đồng nhất dựa trên Embedding
     */
    @PostMapping("/api/image-search")
    public ResponseEntity<Map<String, Object>> searchByImage(
            @RequestParam("image") MultipartFile imageFile) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (imageFile == null || imageFile.isEmpty()) {
                response.put("success", false);
                response.put("message", "Vui lòng tải lên một hình ảnh.");
                return ResponseEntity.badRequest().body(response);
            }

            List<Map<String, Object>> products = imageSearchService.searchBySimilarImage(imageFile);

            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("[IMAGE SEARCH] Lỗi: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Lỗi khi xử lý tìm kiếm: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * POST /api/admin/embedding/generate/{productId}
     * Tạo embedding cho ảnh chính của một sản phẩm cụ thể.
     * Response luôn trả về JSON thống nhất: { success, message, productId }
     */
    @RequestMapping(value = {"/api/admin/embedding/generate/{productId}", "/api/admin/embedding/generate"}, method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> generateEmbedding(
            @PathVariable(required = false) Integer productId,
            @RequestParam(name = "productId", required = false) Integer queryProductId) {
        if (productId == null) {
            productId = queryProductId;
        }
        if (productId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Vui lòng cung cấp productId.");
            return ResponseEntity.badRequest().body(response);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("productId", productId);
        try {
            String result = imageEmbeddingService.generateEmbeddingForProduct(productId);
            boolean success = result.startsWith("Tạo embedding thành công");
            response.put("success", success);
            response.put("message", result);
            if (success) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(500).body(response);
            }
        } catch (Exception e) {
            System.err.println("[EMBEDDING] Lỗi không mong đợi cho productId=" + productId + ": " + e.getMessage());
            response.put("success", false);
            response.put("message", "Lỗi khi tạo embedding: " + e.getMessage());
            response.put("productId", productId);
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * POST /api/admin/embedding/generate-all
     * Tạo embedding hàng loạt cho toàn bộ sản phẩm (chạy nền).
     * Response: { success, message }
     */
    @PostMapping("/api/admin/embedding/generate-all")
    public ResponseEntity<Map<String, Object>> generateAllEmbeddings() {
        Map<String, Object> response = new HashMap<>();
        // Chạy trong thread riêng để không block request
        new Thread(() -> {
            try {
                String result = imageEmbeddingService.generateAllEmbeddings();
                System.out.println("[EMBEDDING ALL] " + result);
            } catch (Exception e) {
                System.err.println("[EMBEDDING ALL] Lỗi: " + e.getMessage());
            }
        }).start();

        response.put("success", true);
        response.put("message",
                "Đã bắt đầu tạo embedding cho tất cả sản phẩm ở background. Kiểm tra console để theo dõi tiến trình.");
        return ResponseEntity.ok(response);
    }
}
