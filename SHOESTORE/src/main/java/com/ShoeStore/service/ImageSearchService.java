package com.ShoeStore.service;

import com.ShoeStore.model.EmbeddingDocument;
import com.ShoeStore.repository.EmbeddingRepository;
import com.ShoeStore.util.CosineSimilarity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class ImageSearchService {

    @Autowired
    private GeminiEmbeddingService geminiEmbeddingService;

    @Autowired
    private EmbeddingRepository embeddingRepository;

    @Autowired
    private JdbcTemplate jdbc;

    public List<Map<String, Object>> searchBySimilarImage(MultipartFile imageFile) throws Exception {
        byte[] imageBytes = imageFile.getBytes();
        String mimeType = imageFile.getContentType() != null ? imageFile.getContentType() : "image/jpeg";
        List<Double> queryVector = geminiEmbeddingService.getEmbedding(imageBytes, mimeType);

        if (queryVector == null || queryVector.isEmpty()) {
            System.err.println("[SEARCH] Lỗi: Vector embedding rỗng từ Gemini API.");
            return Collections.emptyList();
        }

        List<EmbeddingDocument> allEmbeddings = embeddingRepository.findAll();
        if (allEmbeddings == null || allEmbeddings.isEmpty()) {
            return Collections.emptyList();
        }

        List<double[]> scored = new ArrayList<>();
        for (EmbeddingDocument pe : allEmbeddings) {
            try {
                List<Double> storedVector = pe.getEmbedding();
                boolean isEmpty = storedVector == null || storedVector.isEmpty();

                if (isEmpty) {
                    continue;
                }

                if (storedVector.size() != queryVector.size()) {
                    System.err.println("[SEARCH] Lỗi: Kích thước vector không khớp (Query=" + queryVector.size() + ", Stored=" + storedVector.size() + " cho ProductId=" + pe.getProductId() + ")");
                    continue;
                }

                double similarity = CosineSimilarity.calculate(queryVector, storedVector);
                scored.add(new double[] { pe.getProductId(), similarity });
            } catch (Exception e) {
                System.err.println("[SEARCH] Bỏ qua embedding ID=" + pe.getId() + ": " + e.getMessage());
            }
        }

        scored.sort((a, b) -> Double.compare(b[1], a[1]));

        List<Integer> top5Ids = new ArrayList<>();
        for (int i = 0; i < Math.min(5, scored.size()); i++) {
            top5Ids.add((int) scored.get(i)[0]);
        }

        if (top5Ids.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> results = fetchProductDetails(top5Ids, scored);
        System.out.println("[SEARCH] Tìm kiếm bằng hình ảnh thành công, tìm thấy " + results.size() + " sản phẩm phù hợp.");
        return results;
    }

    private List<Map<String, Object>> fetchProductDetails(List<Integer> ids, List<double[]> scored) {
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        String sql = "SELECT p.id, p.product_name, p.brand_name, " +
                "(SELECT TOP 1 '/images/' + image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image_url, " +
                "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id AND quantity > 0) as min_price, " +
                "(SELECT SUM(quantity) FROM product_variants WHERE product_id = p.id) as total_stock " +
                "FROM products p " +
                "WHERE p.id IN (" + placeholders + ") AND p.status = 1";

        List<Map<String, Object>> rows = jdbc.queryForList(sql, ids.toArray());

        Map<Integer, Double> scoreMap = new HashMap<>();
        for (double[] entry : scored) {
            scoreMap.put((int) entry[0], entry[1]);
        }

        rows.forEach(row -> {
            int id = ((Number) row.get("id")).intValue();
            row.put("similarity", scoreMap.getOrDefault(id, 0.0));
        });

        rows.sort((a, b) -> Double.compare(
                (Double) b.get("similarity"),
                (Double) a.get("similarity")));

        return rows;
    }
}
