package com.ShoeStore.service;

import com.ShoeStore.model.EmbeddingDocument;
import com.ShoeStore.model.Product;
import com.ShoeStore.repository.EmbeddingRepository;
import com.ShoeStore.repository.ProductRepository;
import com.ShoeStore.service.impl.GeminiVisionService;
import com.ShoeStore.util.CosineSimilarity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ImageSearchService {

    @Autowired
    private GeminiEmbeddingService geminiEmbeddingService;

    @Autowired
    private GeminiVisionService geminiVisionService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EmbeddingRepository embeddingRepository;

    @Autowired
    private JdbcTemplate jdbc;

    public List<Map<String, Object>> searchBySimilarImage(MultipartFile imageFile) throws Exception {
        byte[] imageBytes = imageFile.getBytes();
        String mimeType = imageFile.getContentType() != null ? imageFile.getContentType() : "image/jpeg";
        String base64Image = "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(imageBytes);

        // 1. Extract pixel-level dominant colors directly from image bytes
        List<String> pixelColors = extractDominantColorsFromImage(imageBytes);
        System.out.println("[IMAGE SEARCH] Pixel Dominant Colors -> " + pixelColors);

        // 2. AI Vision extraction for Model, Brand & Color identification
        Map<String, Object> aiInfo = new HashMap<>();
        try {
            aiInfo = geminiVisionService.extractProductInfoFromImage(base64Image, imageFile.getOriginalFilename(), "");
        } catch (Exception e) {
            System.err.println("[IMAGE SEARCH] Vision extraction exception: " + e.getMessage());
        }

        String detectedName = aiInfo.get("productName") != null ? aiInfo.get("productName").toString().toLowerCase().trim() : "";
        String detectedBrand = aiInfo.get("brandName") != null ? aiInfo.get("brandName").toString().toLowerCase().trim() : "";
        String detectedColor = aiInfo.get("colorName") != null ? aiInfo.get("colorName").toString().toLowerCase().trim() : "";

        System.out.println("[IMAGE SEARCH] AI Vision Detected -> Name: " + detectedName + " | Brand: " + detectedBrand + " | Color: " + detectedColor);

        // Combine all target search colors (from RGB pixel analysis + AI Vision)
        Set<String> searchColors = new HashSet<>(pixelColors);
        if (!detectedColor.isEmpty()) {
            if (detectedColor.contains("xanh") || detectedColor.contains("blue") || detectedColor.contains("navy")) searchColors.add("xanh");
            if (detectedColor.contains("hồng") || detectedColor.contains("pink")) searchColors.add("hồng");
            if (detectedColor.contains("đỏ") || detectedColor.contains("red")) searchColors.add("đỏ");
            if (detectedColor.contains("đen") || detectedColor.contains("black")) searchColors.add("đen");
            if (detectedColor.contains("trắng") || detectedColor.contains("white")) searchColors.add("trắng");
        }

        // 3. Query Vector Embedding
        List<Double> queryVector = null;
        try {
            queryVector = geminiEmbeddingService.getEmbedding(imageBytes, mimeType);
        } catch (Exception e) {
            System.err.println("[IMAGE SEARCH] Vector embedding exception: " + e.getMessage());
        }

        // 4. Fetch active products
        List<Product> activeProducts = productRepository.findAll().stream()
                .filter(p -> p != null && (p.getStatus() == null || p.getStatus() == 1))
                .filter(p -> p.getCategory() == null || p.getCategory().isActive())
                .collect(Collectors.toList());

        if (activeProducts.isEmpty()) {
            return Collections.emptyList();
        }

        List<EmbeddingDocument> allEmbeddings = embeddingRepository.findAll();
        Map<Integer, List<Double>> embeddingMap = new HashMap<>();
        if (allEmbeddings != null) {
            for (EmbeddingDocument pe : allEmbeddings) {
                if (pe.getEmbedding() != null && !pe.getEmbedding().isEmpty()) {
                    embeddingMap.put(pe.getProductId(), pe.getEmbedding());
                }
            }
        }

        List<double[]> scored = new ArrayList<>();

        for (Product p : activeProducts) {
            double totalScore = 0.0;

            String pNameLower = p.getProductName() != null ? p.getProductName().toLowerCase().trim() : "";
            String bNameLower = p.getBrandName() != null ? p.getBrandName().toLowerCase().trim() : "";

            // A. Exact Model / Product Name Matching (+10.0 points)
            boolean modelMatched = false;
            if (!detectedName.isEmpty()) {
                if (pNameLower.equalsIgnoreCase(detectedName) || pNameLower.contains(detectedName) || detectedName.contains(pNameLower)) {
                    totalScore += 10.0;
                    modelMatched = true;
                } else {
                    String[] keywords = detectedName.split("\\s+");
                    for (String kw : keywords) {
                        if (kw.length() >= 3 && pNameLower.contains(kw)) {
                            totalScore += 3.0;
                            modelMatched = true;
                        }
                    }
                }
            }

            // B. Brand Matching (+3.0 points)
            if (!detectedBrand.isEmpty() && !bNameLower.isEmpty()) {
                if (bNameLower.contains(detectedBrand) || detectedBrand.contains(bNameLower)) {
                    totalScore += 3.0;
                }
            }

            // C. Color Matching (+15.0 points)
            Set<String> productColors = new HashSet<>();
            if (p.getVariants() != null) {
                for (var v : p.getVariants()) {
                    if (v.getColor() != null && v.getColor().getColorName() != null) {
                        productColors.add(v.getColor().getColorName().toLowerCase().trim());
                    }
                }
            }
            if (pNameLower.contains("white") || pNameLower.contains("trắng")) productColors.add("trắng");
            if (pNameLower.contains("black") || pNameLower.contains("đen")) productColors.add("đen");
            if (pNameLower.contains("blue") || pNameLower.contains("xanh") || pNameLower.contains("military") || pNameLower.contains("navy")) productColors.add("xanh");
            if (pNameLower.contains("pink") || pNameLower.contains("hồng")) productColors.add("hồng");
            if (pNameLower.contains("red") || pNameLower.contains("đỏ")) productColors.add("đỏ");

            boolean colorMatched = false;
            if (!searchColors.isEmpty()) {
                for (String sCol : searchColors) {
                    for (String pCol : productColors) {
                        if (pCol.contains(sCol) || sCol.contains(pCol)) {
                            colorMatched = true;
                            break;
                        }
                    }
                    if (colorMatched) break;
                }

                if (colorMatched) {
                    totalScore += 15.0; // TOP PRIORITY SCORE FOR MATCHING COLOR!
                }
            }

            // D. Vector Embedding Similarity
            if (queryVector != null && !queryVector.isEmpty() && embeddingMap.containsKey(p.getId())) {
                List<Double> storedVector = embeddingMap.get(p.getId());
                if (storedVector.size() == queryVector.size()) {
                    double vectorSim = CosineSimilarity.calculate(queryVector, storedVector);
                    if (vectorSim > 0) totalScore += vectorSim * 2.0;
                }
            }

            // Always add base score so active products remain visible if relevant
            if (totalScore == 0.0) {
                totalScore = 0.1;
            }

            scored.add(new double[] { p.getId(), totalScore });
        }

        scored.sort((a, b) -> Double.compare(b[1], a[1]));

        List<Integer> topIds = new ArrayList<>();
        for (int i = 0; i < Math.min(5, scored.size()); i++) {
            topIds.add((int) scored.get(i)[0]);
        }

        if (topIds.isEmpty()) {
            return Collections.emptyList();
        }

        return fetchProductDetails(topIds, scored);
    }

    private List<String> extractDominantColorsFromImage(byte[] imageBytes) {
        List<String> colors = new ArrayList<>();
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (img == null) return colors;

            int width = img.getWidth();
            int height = img.getHeight();

            int count = 0;
            int bluePixelCount = 0;
            int pinkPixelCount = 0;
            int redPixelCount = 0;
            int blackPixelCount = 0;
            int whitePixelCount = 0;
            int greenPixelCount = 0;

            for (int y = 0; y < height; y += 4) {
                for (int x = 0; x < width; x += 4) {
                    int rgb = img.getRGB(x, y);
                    int r = (rgb >> 16) & 0xFF;
                    int g = (rgb >> 8) & 0xFF;
                    int b = rgb & 0xFF;
                    count++;

                    float[] hsv = new float[3];
                    Color.RGBtoHSB(r, g, b, hsv);
                    float h = hsv[0] * 360; // Hue (0-360)
                    float s = hsv[1];       // Saturation (0-1)
                    float v = hsv[2];       // Value / Brightness (0-1)

                    if (v < 0.22) {
                        blackPixelCount++;
                    } else if (s < 0.15 && v > 0.80) {
                        whitePixelCount++;
                    } else if (s > 0.2) {
                        if (h >= 170 && h <= 265) {
                            bluePixelCount++;
                        } else if (h >= 290 && h <= 350) {
                            pinkPixelCount++;
                        } else if ((h >= 350 || h <= 15) && s > 0.3) {
                            redPixelCount++;
                        } else if (h >= 80 && h <= 165) {
                            greenPixelCount++;
                        }
                    }
                }
            }

            if (count > 0) {
                if (bluePixelCount > count * 0.03) colors.add("xanh");
                if (pinkPixelCount > count * 0.03) colors.add("hồng");
                if (redPixelCount > count * 0.03) colors.add("đỏ");
                if (greenPixelCount > count * 0.03) colors.add("xanh lá");
                if (blackPixelCount > count * 0.30) colors.add("đen");
                if (whitePixelCount > count * 0.30) colors.add("trắng");
            }
        } catch (Exception e) {
            System.err.println("[COLOR EXTRACTION] Error: " + e.getMessage());
        }
        return colors;
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
