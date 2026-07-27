package com.ShoeStore.service;

import com.ShoeStore.model.EmbeddingDocument;
import com.ShoeStore.model.Product;
import com.ShoeStore.model.ProductImage;
import com.ShoeStore.repository.EmbeddingRepository;
import com.ShoeStore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class ImageEmbeddingService {

    @Autowired
    private GeminiEmbeddingService geminiEmbeddingService;

    @Autowired
    private EmbeddingRepository embeddingRepository;

    @Autowired
    private ProductRepository productRepository;

    public String generateEmbeddingForProduct(Integer productId) {
        String currentStep = "Không xác định";
        try {
            // STEP 1: Lấy Product
            currentStep = "[STEP 1]";
            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                System.err.println("[STEP 1] Lỗi: Sản phẩm ID " + productId + " không tồn tại.");
                return "Lỗi ở [STEP 1]:\nSản phẩm không tồn tại.";
            }
            Product product = productOpt.get();

            // STEP 2: Lấy ảnh chính
            currentStep = "[STEP 2]";
            Set<ProductImage> images = product.getImages();
            if (images == null || images.isEmpty()) {
                System.err.println("[STEP 2] Lỗi: Không có hình ảnh cho sản phẩm ID " + productId);
                return "Lỗi ở [STEP 2]:\nKhông có hình ảnh cho sản phẩm này.";
            }

            // Ưu tiên lấy ảnh có isPrimary = true
            ProductImage selectedImage = images.stream()
                    .filter(img -> img != null && Boolean.TRUE.equals(img.getIsPrimary()) && img.getImageUrl() != null
                            && !img.getImageUrl().trim().isEmpty())
                    .findFirst()
                    .orElse(null);

            if (selectedImage == null) {
                // Nếu không có ảnh chính thì lấy ảnh đầu tiên
                selectedImage = images.stream()
                        .filter(img -> img != null && img.getImageUrl() != null && !img.getImageUrl().trim().isEmpty())
                        .findFirst()
                        .orElse(null);
            }

            if (selectedImage == null) {
                System.err.println("[STEP 2] Lỗi: Sản phẩm ID " + productId + " không có hình ảnh hợp lệ.");
                return "Lỗi ở [STEP 2]:\nSản phẩm không có hình ảnh hợp lệ.";
            }

            String imageUrl = selectedImage.getImageUrl();

            // STEP 3: Đường dẫn ảnh
            currentStep = "[STEP 3]";
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            File imageFile = new File(uploadDir + imageUrl);
            if (!imageFile.exists()) {
                System.err.println("[STEP 3] Lỗi: File ảnh không tồn tại: " + imageFile.getAbsolutePath());
                return "Lỗi ở [STEP 3]:\nFile ảnh không tồn tại: " + imageFile.getAbsolutePath();
            }

            // STEP 4: Đọc file
            currentStep = "[STEP 4]";
            byte[] imageBytes = Files.readAllBytes(imageFile.toPath());
            String mimeType = Files.probeContentType(imageFile.toPath());
            if (mimeType == null) {
                mimeType = "image/jpeg";
            }

            // STEP 5: Gọi Gemini Embedding
            currentStep = "[STEP 5]";
            List<Double> vector = geminiEmbeddingService.getEmbedding(imageBytes, mimeType);

            // STEP 6: Kiểm tra vector
            currentStep = "[STEP 6]";
            if (vector == null || vector.isEmpty()) {
                System.err.println("[STEP 6] Lỗi: Nhận vector rỗng từ Gemini API cho sản phẩm ID " + productId);
                return "Lỗi ở [STEP 6]:\nVector embedding rỗng.";
            }

            // STEP 7: Lưu MongoDB
            currentStep = "[STEP 7]";
            Optional<EmbeddingDocument> existingOpt = embeddingRepository.findByProductId(productId);
            EmbeddingDocument doc;
            if (existingOpt.isPresent()) {
                doc = existingOpt.get();
            } else {
                doc = new EmbeddingDocument();
            }
            doc.setProductId(productId);
            doc.setEmbedding(vector);

            embeddingRepository.save(doc);

            // Summary log
            System.out.println("Tạo embedding thành công cho sản phẩm ID " + productId + " (" + product.getProductName() + ")");

            return "Tạo embedding thành công cho sản phẩm ID " + productId;

        } catch (Exception e) {
            System.err.println("Lỗi ở " + currentStep + " cho sản phẩm ID " + productId + ": " + e.getMessage());
            e.printStackTrace();
            return "Lỗi ở " + currentStep + ":\n" + e.getMessage();
        }
    }

    public String generateAllEmbeddings() {
        System.out.println("[BATCH] Bắt đầu tạo embedding cho toàn bộ sản phẩm...");
        List<Product> products = productRepository.findAll();
        System.out.println("[BATCH] Tổng số sản phẩm: " + products.size());
        int count = 0;
        int failed = 0;
        for (Product p : products) {
            String res = generateEmbeddingForProduct(p.getId());
            if (res.startsWith("Tạo embedding thành công")) {
                count++;
            } else {
                failed++;
                System.err.println("[BATCH][FAIL] Product ID=" + p.getId() + ": " + res);
            }
        }
        String summary = "Đã tạo thành công " + count + "/" + products.size() + " embeddings. Lỗi: " + failed + ".";
        System.out.println("[BATCH] " + summary);
        return summary;
    }
}
