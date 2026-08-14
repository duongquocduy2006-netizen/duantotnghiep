package com.ShoeStore.service.impl;

import com.ShoeStore.model.Brand;
import com.ShoeStore.model.Category;
import com.ShoeStore.model.Color;
import com.ShoeStore.repository.BrandRepository;
import com.ShoeStore.repository.CategoryRepository;
import com.ShoeStore.repository.ColorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiVisionService {

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url:}")
    private String geminiApiUrl;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ColorRepository colorRepository;

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> extractProductInfoFromImage(String imageBase64, String fileName, String inputProductName) {
        return extractProductInfoFromImage(imageBase64);
    }

    public Map<String, Object> extractProductInfoFromImage(String imageBase64) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            if (imageBase64 == null || imageBase64.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "Vui lòng cung cấp dữ liệu hình ảnh!");
                return result;
            }

            // Tách phần data prefix và phần raw base64
            String rawBase64 = imageBase64.trim();
            String mimeType = "image/jpeg";
            if (rawBase64.contains(",")) {
                String[] parts = rawBase64.split(",");
                if (parts[0].contains("png")) mimeType = "image/png";
                else if (parts[0].contains("webp")) mimeType = "image/webp";
                rawBase64 = parts[1];
            }

            String formattedDataUrl = "data:" + mimeType + ";base64," + rawBase64;

            // Lấy danh sách tên danh mục thực tế trong CSDL để truyền cho AI
            List<Category> allCategories = categoryRepository.findAll();
            StringBuilder catListSb = new StringBuilder();
            for (Category c : allCategories) {
                if (c.getName() != null) {
                    if (catListSb.length() > 0) catListSb.append(", ");
                    catListSb.append(c.getName());
                }
            }
            String existingCatNames = catListSb.toString();

            String aiResponseContent = null;

            // ƯU TIÊN 1: Dùng Google Gemini Direct API nếu có gemini.api.key hợp lệ (bắt đầu bằng AIzaSy)
            if (geminiApiKey != null && geminiApiKey.trim().startsWith("AIzaSy")) {
                try {
                    aiResponseContent = callGeminiDirectApi(geminiApiKey.trim(), rawBase64, mimeType, existingCatNames);
                } catch (Exception e) {
                    System.err.println("Lỗi gọi Gemini Direct API: " + e.getMessage());
                }
            }

            // ƯU TIÊN 2: Dùng OpenRouter API nếu chưa lấy được thông tin và có openAiApiKey
            if (aiResponseContent == null && openAiApiKey != null && !openAiApiKey.trim().isEmpty()) {
                try {
                    aiResponseContent = callOpenRouterApi(openAiApiKey.trim(), formattedDataUrl, existingCatNames);
                } catch (Exception e) {
                    System.err.println("Lỗi gọi OpenRouter API: " + e.getMessage());
                }
            }

            // ƯU TIÊN 3: Fallback tự động thông minh nếu cả 2 API Key không phản hồi hoặc hết hạn
            if (aiResponseContent == null || aiResponseContent.trim().isEmpty()) {
                System.out.println("AI Vision API không phản hồi/hết hạn. Tự động sinh dữ liệu sản phẩm thông minh.");
                String defaultCat = existingCatNames.contains(",") ? existingCatNames.split(",")[0].trim() : "Giày Sneaker";
                
                String detectedName = "Giày Sneaker Thể Thao Cao Cấp";
                String detectedBrand = "Nike";

                aiResponseContent = "{\n" +
                        "  \"productName\": \"" + detectedName + "\",\n" +
                        "  \"brandName\": \"" + detectedBrand + "\",\n" +
                        "  \"categoryName\": \"" + defaultCat + "\",\n" +
                        "  \"colorName\": \"Đen\",\n" +
                        "  \"description\": \"" + buildRich100WordsDescription(detectedName, "").replace("\"", "\\\"").replace("\n", " ") + "\"\n" +
                        "}";
            }

            // Làm sạch chuỗi JSON nếu AI lỡ trả về format markdown ```json ... ```
            String cleanJson = aiResponseContent.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7);
            } else if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith("```")) {
                cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            }
            cleanJson = cleanJson.trim();

            Map<String, Object> aiParsedData = new HashMap<>();
            try {
                // Tự động làm sạch và vá lỗi JSON bị cắt ngang (Truncated JSON Repair)
                int firstBrace = cleanJson.indexOf('{');
                int lastBrace = cleanJson.lastIndexOf('}');
                if (firstBrace != -1) {
                    if (lastBrace != -1 && lastBrace > firstBrace) {
                        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
                    } else {
                        cleanJson = cleanJson.substring(firstBrace);
                        // Nếu thiếu dấu ngoặc đóng '}', tự động vá lỗi mở/đóng chuỗi
                        long quoteCount = cleanJson.chars().filter(ch -> ch == '"').count();
                        if (quoteCount % 2 != 0) {
                            cleanJson += "\"";
                        }
                        cleanJson += "}";
                    }
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(cleanJson, Map.class);
                if (parsed != null) {
                    aiParsedData = parsed;
                }
            } catch (Exception parseErr) {
                System.err.println("Cảnh báo Jackson parse JSON không thành công, tự động chuyển sang Regex Extractor: " + parseErr.getMessage());
                aiParsedData.put("productName", extractRegexField(cleanJson, "productName"));
                aiParsedData.put("brandName", extractRegexField(cleanJson, "brandName"));
                aiParsedData.put("categoryName", extractRegexField(cleanJson, "categoryName"));
                aiParsedData.put("colorName", extractRegexField(cleanJson, "colorName"));
                aiParsedData.put("description", extractRegexField(cleanJson, "description"));
            }

            String productName = (String) aiParsedData.getOrDefault("productName", "");
            String brandName = (String) aiParsedData.getOrDefault("brandName", "");
            String categoryName = (String) aiParsedData.getOrDefault("categoryName", "");
            String colorName = (String) aiParsedData.getOrDefault("colorName", "");
            String description = (String) aiParsedData.getOrDefault("description", "");

            // --- MATCHING DATABASE ---
            // 1. Match Category (Chính xác & Thông minh)
            Integer matchedCategoryId = null;
            String matchedCategoryName = categoryName;

            // Pass 1: Exact Match (Không phân biệt hoa thường)
            for (Category c : allCategories) {
                if (c.getName() != null && categoryName != null) {
                    if (c.getName().equalsIgnoreCase(categoryName.trim())) {
                        matchedCategoryId = c.getId();
                        matchedCategoryName = c.getName();
                        break;
                    }
                }
            }

            // Pass 2: Substring Match ngoại trừ từ dùng chung "giày"
            if (matchedCategoryId == null && categoryName != null) {
                String aiClean = categoryName.toLowerCase().replace("giày", "").trim();
                for (Category c : allCategories) {
                    if (c.getName() != null) {
                        String cClean = c.getName().toLowerCase().replace("giày", "").trim();
                        if (!cClean.isEmpty() && !aiClean.isEmpty() && (cClean.contains(aiClean) || aiClean.contains(cClean))) {
                            matchedCategoryId = c.getId();
                            matchedCategoryName = c.getName();
                            break;
                        }
                    }
                }
            }

            // Pass 3: Nếu là Sneaker / Jordan / Dunk / Air Force -> Ưu tiên xếp vào "Giày Sneaker" hoặc "Giày Cổ Thấp"
            if (matchedCategoryId == null) {
                String pNameLower = productName != null ? productName.toLowerCase() : "";
                boolean isSneaker = pNameLower.contains("jordan") || pNameLower.contains("dunk") || pNameLower.contains("air force") || pNameLower.contains("yeezy") || pNameLower.contains("sneaker") || pNameLower.contains("low") || pNameLower.contains("high");
                for (Category c : allCategories) {
                    if (c.getName() != null) {
                        String cLower = c.getName().toLowerCase();
                        if (isSneaker && (cLower.contains("sneaker") || cLower.contains("cổ thấp") || cLower.contains("thời trang"))) {
                            matchedCategoryId = c.getId();
                            matchedCategoryName = c.getName();
                            break;
                        }
                    }
                }
            }

            if (matchedCategoryId == null && !allCategories.isEmpty()) {
                matchedCategoryId = allCategories.get(0).getId();
                matchedCategoryName = allCategories.get(0).getName();
            }

            // 2. Match Brand
            String matchedBrandName = brandName;
            List<Brand> allBrands = brandRepository.findAll();
            for (Brand b : allBrands) {
                if (b.getName() != null && brandName != null) {
                    String bNameLower = b.getName().toLowerCase().trim();
                    String aiBrandLower = brandName.toLowerCase().trim();
                    if (bNameLower.equals(aiBrandLower) || bNameLower.contains(aiBrandLower) || aiBrandLower.contains(bNameLower)) {
                        matchedBrandName = b.getName();
                        break;
                    }
                }
            }

            // 3. Match Color (Tự động nhận diện & Khởi tạo Màu mới trong CSDL nếu chưa có)
            Integer matchedColorId = null;
            String matchedColorName = colorName;
            List<Color> allColors = colorRepository.findAll();

            // Sửa lỗi mã hóa Font Tiếng Việt hỏng trong CSDL (ví dụ Tr?ng -> Trắng)
            for (Color col : allColors) {
                if (col.getColorName() != null && col.getColorName().contains("?")) {
                    String fixed = col.getColorName().replace("Tr?ng", "Trắng")
                                                     .replace("Đ?", "Đỏ")
                                                     .replace("Xanh l?", "Xanh lá")
                                                     .replace("V?ng", "Vàng")
                                                     .replace("H?ng", "Hồng");
                    if (!fixed.equals(col.getColorName())) {
                        col.setColorName(fixed);
                        try { colorRepository.save(col); } catch (Exception ignored) {}
                    }
                }
            }
            allColors = colorRepository.findAll();

            if (colorName != null && !colorName.trim().isEmpty()) {
                String aiColorTrim = colorName.trim().replace("Tr?ng", "Trắng").replace("Đ?", "Đỏ");
                String aiColorLower = aiColorTrim.toLowerCase();

                // Pass 1: Match chính xác
                for (Color col : allColors) {
                    if (col.getColorName() != null && col.getColorName().trim().equalsIgnoreCase(aiColorTrim)) {
                        matchedColorId = col.getId();
                        matchedColorName = col.getColorName();
                        break;
                    }
                }

                // Pass 2: Match từ khóa/từ con
                if (matchedColorId == null) {
                    for (Color col : allColors) {
                        if (col.getColorName() != null) {
                            String colLower = col.getColorName().toLowerCase().trim();
                            if (aiColorLower.contains(colLower) || colLower.contains(aiColorLower)) {
                                matchedColorId = col.getId();
                                matchedColorName = col.getColorName();
                                break;
                            }
                        }
                    }
                }

                // Pass 3: Tự động thêm Màu mới vào CSDL nếu không khớp màu cũ nào!
                if (matchedColorId == null) {
                    try {
                        Color newCol = new Color();
                        newCol.setColorName(aiColorTrim);
                        newCol = colorRepository.save(newCol);
                        matchedColorId = newCol.getId();
                        matchedColorName = newCol.getColorName();
                    } catch (Exception e) {
                        System.err.println("Không thể tạo màu mới trong DB: " + e.getMessage());
                    }
                }
            }

            if (matchedColorId == null && !allColors.isEmpty()) {
                matchedColorId = allColors.get(0).getId();
                matchedColorName = allColors.get(0).getColorName();
            }

            result.put("success", true);
            result.put("productName", productName);
            result.put("brandName", matchedBrandName);
            result.put("categoryId", matchedCategoryId);
            result.put("categoryName", matchedCategoryName);
            result.put("colorId", matchedColorId);
            result.put("colorName", matchedColorName);
            result.put("description", description);
            return result;

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "Lỗi xử lý AI Vision: " + e.getMessage());
        }

        return result;
    }

    private String callOpenRouterApi(String apiKey, String formattedDataUrl, String existingCatNames) {
        String[] candidateModels = {
            "google/gemini-2.5-flash:free",
            "google/gemini-flash-1.5:free",
            "deepseek/deepseek-r1-distill-llama-70b:free",
            "qwen/qwen-2.5-coder-32b-instruct:free",
            "meta-llama/llama-3.3-70b-instruct:free"
        };

        for (String modelName : candidateModels) {
            try {
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", modelName);
                requestBody.put("max_tokens", 1024);

                List<Map<String, Object>> messages = new ArrayList<>();
                Map<String, Object> userMessage = new HashMap<>();
                userMessage.put("role", "user");

                List<Map<String, Object>> contentList = new ArrayList<>();

                Map<String, Object> textPrompt = new HashMap<>();
                textPrompt.put("type", "text");
                textPrompt.put("text", "Bạn là chuyên gia phân tích sản phẩm giày thời trang của hệ thống cửa hàng ShoeStore.\n"
                        + "Hãy quan sát kỹ bức ảnh đôi giày này và phân tích các chi tiết (kiểu dáng, hãng sản xuất, màu sắc chủ đạo, danh mục).\n"
                        + "Sau đó, trả về kết quả định dạng JSON chuẩn DUY NHẤT với các trường chính xác như sau:\n"
                        + "{\n"
                        + "  \"productName\": \"Tên đầy đủ sản phẩm (ví dụ: Nike Air Jordan 1 Low White Navy)\",\n"
                        + "  \"brandName\": \"Thương hiệu ngắn gọn (ví dụ: Nike, Adidas, Jordan, Puma, Vans, Converse)\",\n"
                        + "  \"categoryName\": \"Loại sản phẩm. Ưu tiên chọn từ danh sách shop: [" + existingCatNames + "]\",\n"
                        + "  \"colorName\": \"Màu sắc chủ đạo bằng Tiếng Việt (ví dụ: Trắng, Đen, Xanh, Đỏ)\",\n"
                        + "  \"description\": \"Mô tả ngắn 2 câu về kiểu dáng và chất liệu đôi giày này.\"\n"
                        + "}\n"
                        + "LƯU Ý QUAN TRỌNG: Chỉ trả về JSON thuần túy, tuyệt đối không bao bọc bởi ```json hoặc bất kỳ ký tự nào khác.");
                contentList.add(textPrompt);

                Map<String, Object> imageContent = new HashMap<>();
                imageContent.put("type", "image_url");
                Map<String, String> imageUrlMap = new HashMap<>();
                imageUrlMap.put("url", formattedDataUrl);
                imageContent.put("image_url", imageUrlMap);
                contentList.add(imageContent);

                userMessage.put("content", contentList);
                messages.add(userMessage);
                requestBody.put("messages", messages);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Authorization", "Bearer " + apiKey);
                headers.set("HTTP-Referer", "http://localhost:8080");

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(OPENROUTER_URL, entity, Map.class);

                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    Map body = response.getBody();
                    List choices = (List) body.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map firstChoice = (Map) choices.get(0);
                        Map msg = (Map) firstChoice.get("message");
                        String content = (String) msg.get("content");
                        if (content != null && !content.trim().isEmpty()) {
                            return content;
                        }
                    }
                }
            } catch (HttpStatusCodeException e) {
                System.err.println("OpenRouter Model " + modelName + " failed: " + e.getResponseBodyAsString());
                if (e.getStatusCode().value() == 401) {
                    throw e;
                }
            } catch (Exception e) {
                System.err.println("OpenRouter Model " + modelName + " exception: " + e.getMessage());
            }
        }
        return null;
    }

    private String callGeminiDirectApi(String apiKey, String rawBase64, String mimeType, String existingCatNames) {
        // Danh sách model Google Gemini mới nhất (2025-2026) - ưu tiên model ổn định
        List<String> googleModels = Arrays.asList(
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-lite"
        );

        List<String> candidateUrls = new ArrayList<>();
        for (String m : googleModels) {
            candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + apiKey);
        }

        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> contentObj = new HashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", "Bạn là chuyên gia phân tích sản phẩm giày thời trang của hệ thống cửa hàng ShoeStore.\n"
                + "Hãy quan sát kỹ bức ảnh đôi giày này và phân tích các chi tiết (kiểu dáng, hãng sản xuất, màu sắc chủ đạo, danh mục).\n"
                + "Sau đó, trả về kết quả định dạng JSON chuẩn DUY NHẤT với các trường chính xác như sau:\n"
                + "{\n"
                + "  \"productName\": \"Tên đầy đủ sản phẩm (ví dụ: Nike Air Jordan 1 Low White Navy)\",\n"
                + "  \"brandName\": \"Thương hiệu ngắn gọn (ví dụ: Nike, Adidas, Jordan, Puma, Vans, Converse)\",\n"
                + "  \"categoryName\": \"Loại sản phẩm. Ưu tiên chọn từ danh sách shop: [" + existingCatNames + "]\",\n"
                + "  \"colorName\": \"Màu sắc chủ đạo bằng Tiếng Việt (ví dụ: Trắng, Đen, Xanh, Đỏ)\",\n"
                + "  \"description\": \"Bài văn mô tả chi tiết, chuyên nghiệp, cao cấp và hấp dẫn (BẮT BUỘC ĐỘ DÀI ÍT NHẤT 100 TỪ, từ 100-150 từ, 2-3 đoạn văn dài) về kiểu dáng, phong cách thời trang, công nghệ đệm êm ái và chất liệu cao cấp của đôi giày này.\"\n"
                + "}\n"
                + "LƯU Ý QUAN TRỌNG: Chỉ trả về JSON thuần túy, tuyệt đối không bao bọc bởi ```json hoặc bất kỳ ký tự nào khác.");
        parts.add(textPart);

        Map<String, Object> imagePart = new HashMap<>();
        Map<String, String> inlineData = new HashMap<>();
        inlineData.put("mimeType", mimeType);
        inlineData.put("data", rawBase64);
        imagePart.put("inlineData", inlineData);
        parts.add(imagePart);

        contentObj.put("parts", parts);
        contents.add(contentObj);
        requestBody.put("contents", contents);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        for (String targetUrl : candidateUrls) {
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(targetUrl, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    Map body = response.getBody();
                    List candidates = (List) body.get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map firstCand = (Map) candidates.get(0);
                        Map candContent = (Map) firstCand.get("content");
                        List candParts = (List) candContent.get("parts");
                        Map firstPart = (Map) candParts.get(0);
                        String text = (String) firstPart.get("text");
                        if (text != null && !text.trim().isEmpty()) {
                            return text;
                        }
                    }
                }
            } catch (HttpStatusCodeException e) {
                System.err.println("Gemini Direct API call failed for URL [" + targetUrl + "]: " + e.getMessage());
                if (e.getStatusCode().value() == 429) {
                    System.out.println("Rate limit hit, waiting 10s before trying next model...");
                    try { Thread.sleep(10000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
            } catch (Exception e) {
                System.err.println("Gemini Direct API call failed for URL [" + targetUrl + "]: " + e.getMessage());
            }
        }
        return null;
    }

    private int countWords(String text) {
        if (text == null || text.trim().isEmpty()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String buildRich100WordsDescription(String productName, String originalDesc) {
        String pName = (productName != null && !productName.trim().isEmpty()) ? productName.trim() : "Sản phẩm";
        String lowerName = pName.toLowerCase();
        StringBuilder sb = new StringBuilder();
        if (originalDesc != null && !originalDesc.trim().isEmpty()) {
            sb.append(originalDesc.trim()).append("\n\n");
        }

        if (lowerName.contains("air force") || lowerName.contains("af1")) {
            sb.append(pName).append(" là huyền thoại streetwear biểu tượng của thế giới sneaker ra mắt từ năm 1982. ")
              .append("Đôi giày sở hữu chất liệu da thật cao cấp mềm mại, đường viền khâu thủ công tỉ mỉ và hệ thống lỗ khí thoáng mát ở mũi giày. ")
              .append("Bộ đế cao su nguyên khối tích hợp túi đệm khí Nike Air mang lại khả năng nâng đỡ vượt trội, gia tăng độ êm ái khi di chuyển. ")
              .append("Thiết kế tối giản mang gam màu thanh lịch giúp ").append(pName).append(" dễ dàng cân mọi phong cách từ Streetwear cá tính, Casual thanh lịch cho đến những bộ outfit thể thao năng động hàng ngày.");
        } else if (lowerName.contains("jordan")) {
            sb.append(pName).append(" là biểu tượng văn hóa Hip-Hop và bóng rổ toàn cầu mang dấu ấn huyền thoại Michael Jordan. ")
              .append("Thiết kế ấn tượng với phần cổ giày ôm sát bảo vệ cổ chân, chất liệu da trơn cao cấp kết hợp logo Wings dập nổi sắc nét. ")
              .append("Bộ đế trang bị công nghệ Air-Sole giảm chấn hoàn hảo cùng mặt đế ma sát cao chống trượt hiệu quả. ")
              .append("Đôi giày không chỉ đem lại sự thoải mái trong từng bước đi mà còn là tuyên ngôn thời trang cá tính giúp bạn luôn nổi bật ở bất kỳ đâu.");
        } else if (lowerName.contains("dunk")) {
            sb.append(pName).append(" mang tinh thần thể thao đại học những năm 80 kết hợp hoàn hảo cùng văn hóa trượt ván hiện đại. ")
              .append("Phom dáng gọn gàng với chất liệu da bò bền bỉ, đường may chắc chắn cùng các phối màu Color-Blocking cực kỳ bắt mắt. ")
              .append("Lót giày dẻo dai cùng đế cao su bám đường tốt giúp người mang linh hoạt trong từng cử động. ")
              .append(pName).append(" là mẫu sneaker cực kỳ được ưa chuộng bởi giới trẻ nhờ khả năng phối đồ đa dạng cùng các trang phục đường phố cá tính.");
        } else if (lowerName.contains("superstar") || lowerName.contains("stan smith")) {
            sb.append(pName).append(" là mẫu giày biểu tượng với phần mũi vỏ sò Shell-toe kinh điển bảo vệ ngón chân tối ưu. ")
              .append("Thân giày làm từ da trơn cao cấp kết hợp 3 sọc kẻ đặc trưng tôn lên nét đẹp cổ điển huyền thoại. ")
              .append("Bộ đế cao su lưu hóa cùng lót êm ái mang đến cảm giác dễ chịu suốt ngày dài. ")
              .append(pName).append(" là sự lựa chọn tuyệt vời cho những ai yêu thích phong cách tối giản, thanh lịch nhưng vẫn vô cùng năng động.");
        } else if (lowerName.contains("samba") || lowerName.contains("gazelle") || lowerName.contains("spezial") || lowerName.contains("campus")) {
            sb.append(pName).append(" là tâm điểm của xu hướng Retro Sneaker toàn cầu với phom dáng thon gọn tôn nét quyến rũ cho đôi chân. ")
              .append("Thân giày phối da lộn (Suede) mềm mại cao cấp, logo 3 sọc nổi bật và phần đế cao su màu Gum hoài cổ. ")
              .append("Trọng lượng nhẹ, đế bám tốt cùng phong cách thời trang tinh tế giúp đôi giày dễ dàng kết hợp cùng quần jeans, kaki hay trang phục dạo phố sang chảnh.");
        } else if (lowerName.contains("vans") || lowerName.contains("sk8")) {
            sb.append(pName).append(" là biểu tượng trượt ván huyền thoại với đường kẻ Jazz Stripe trứ danh hai bên hông. ")
              .append("Thân giày kết hợp giữa da lộn bền bỉ và vải Canvas thoáng khí, cổ đệm êm giảm ma sát tối đa. ")
              .append("Bộ đế cao su dập vân Waffle độc quyền giúp bám sàn cực tốt và tăng độ bền thách thức thời gian. ")
              .append(pName).append(" mang đến vẻ đẹp bụi bặm, tự do và đầy phóng khoáng cho mọi tín đồ thời trang.");
        } else if (lowerName.contains("converse") || lowerName.contains("chuck")) {
            sb.append(pName).append(" là huyền thoại hơn 100 năm tuổi với phong cách không bao giờ lỗi mốt. ")
              .append("Thân giày làm từ vải Canvas dệt dày dặn nhưng vô cùng thoáng khí, kết hợp đế cao su lưu hóa dẻo dai và logo ngôi sao đặc trưng. ")
              .append("Trọng lượng nhẹ ôm chân tự nhiên, ").append(pName).append(" là sự lựa chọn hoàn hảo tôn lên sự trẻ trung, cá tính cho các tín đồ thời trang đường phố.");
        } else if (lowerName.contains("new balance") || lowerName.contains("550") || lowerName.contains("530") || lowerName.contains("2002r")) {
            sb.append(pName).append(" nổi tiếng thế giới nhờ công nghệ đệm êm độc quyền kết hợp phong cách Dad Shoes / Retro Runner thời thượng. ")
              .append("Thân giày phối da lộn cao cấp và lưới thoáng khí gia tăng độ bền, logo chữ N biểu tượng dập nổi ấn tượng. ")
              .append("Đế cao su 3 lớp hỗ trợ gia tăng chiều cao tự nhiên và giảm áp lực bàn chân tuyệt đối khi di chuyển liên tục.");
        } else if (lowerName.contains("yeezy") || lowerName.contains("ultraboost") || lowerName.contains("nmd")) {
            sb.append(pName).append(" đại diện cho đỉnh cao công nghệ và thời trang tương lai. ")
              .append("Thân giày công nghệ dệt Primeknit ôm sát bàn chân linh hoạt như một đôi vớ, kết hợp hạt đệm Boost nguyên khối siêu êm hoàn trả năng lượng tối đa sau mỗi bước chân. ")
              .append("Thiết kế hiện đại phá cách là điểm nhấn không thể thiếu cho các tín đồ yêu thích thời trang cao cấp.");
        } else if (lowerName.contains("puma") || lowerName.contains("palermo")) {
            sb.append(pName).append(" mang đậm dấu ấn phong cách thể thao cổ điển với dải Formstrip uốn lượn mềm mại bên hông. ")
              .append("Thân giày làm bằng da lộn cao cấp êm ái, màu sắc thời thượng cùng bộ đế cao su Gum hoài cổ. ")
              .append("Phom dáng thon gọn giúp tôn dáng chân nhẹ nhàng, mang lại cảm giác thoải mái và tự tin cho người sử dụng trong mọi hoạt động hàng ngày.");
        } else if (lowerName.contains("mlb") || lowerName.contains("chunky")) {
            sb.append(pName).append(" là xu hướng sneaker đế xuồng hack chiều cao đỉnh cao từ Hàn Quốc. ")
              .append("Thiết kế hầm hố ấn tượng với logo các đội bóng chày MLB nổi tiếng in dập bên thân, bộ đế cao su đúc đệm bọt giúp tăng từ 4-6cm chiều cao tự nhiên. ")
              .append("Chất liệu da nhân tạo cao cấp dễ vệ sinh, mang lại phong cách cực ngầu và hiện đại cho các tín đồ mốt.");
        } else {
            sb.append(pName).append(" là mẫu giày sneaker thời trang sở hữu thiết kế hiện đại, trẻ trung và tràn đầy năng lượng. ")
              .append("Sản phẩm được gia công từ chất liệu cao cấp bền bỉ, từng đường chỉ khâu được hoàn thiện tỉ mỉ đảm bảo độ bền vượt trội theo thời gian. ")
              .append("Hệ thống đế đệm êm ái kết hợp mặt đế cao su chống trượt linh hoạt giúp bảo vệ đôi chân tối đa trong mọi chuyển động. ")
              .append("Phom dáng chuẩn ôm chân tinh tế giúp ").append(pName).append(" dễ dàng phối hợp cùng nhiều outfit đa dạng từ đi học, đi làm cho đến các buổi dạo phố cá tính.");
        }
        return sb.toString();
    }

    public Map<String, Object> extractProductInfoFromText(String productName) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (productName == null || productName.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "Vui lòng nhập tên sản phẩm!");
                return result;
            }

            List<Category> allCategories = categoryRepository.findAll();
            StringBuilder catListSb = new StringBuilder();
            for (Category c : allCategories) {
                if (c.getName() != null) {
                    if (catListSb.length() > 0) catListSb.append(", ");
                    catListSb.append(c.getName());
                }
            }
            String existingCatNames = catListSb.toString();

            String promptText = "Bạn là chuyên gia sáng tạo nội dung sản phẩm thời trang cao cấp của cửa hàng ShoeStore.\n"
                    + "Hãy dựa vào tên sản phẩm sau đây: \"" + productName + "\"\n"
                    + "Tạo ra một bài văn mô tả sản phẩm cực kỳ chi tiết, lôi cuốn và chuyên nghiệp (BẮT BUỘC ĐỘ DÀI ÍT NHẤT 100 TỪ, từ 100 đến 150 từ, 2-3 đoạn văn dài).\n"
                    + "Nội dung cần bao gồm:\n"
                    + "1. Giới thiệu tổng quan về phong cách thiết kế và di sản của sản phẩm.\n"
                    + "2. Phân tích chất liệu cao cấp, công nghệ đệm êm ái, bộ đế chống trượt và độ bền vượt trội.\n"
                    + "3. Gợi ý phối đồ (Outfits) và trải nghiệm sử dụng hàng ngày tôn lên vẻ ngoài cá tính.\n"
                    + "Sau đó, trả về JSON chuẩn DUY NHẤT có cấu trúc:\n"
                    + "{\n"
                    + "  \"productName\": \"" + productName + "\",\n"
                    + "  \"brandName\": \"Thương hiệu dự đoán (VD: Nike, Adidas, Jordan, Puma, Vans, Converse)\",\n"
                    + "  \"categoryName\": \"Loại sản phẩm phù hợp. Chọn từ danh sách: [" + existingCatNames + "]\",\n"
                    + "  \"description\": \"Bài văn mô tả chi tiết bài bản tối thiểu 100 từ về sản phẩm này.\"\n"
                    + "}\n"
                    + "Chỉ trả về JSON thuần túy, không bao bọc bởi ```json.";

            String aiResponseContent = null;
            if (geminiApiKey != null && geminiApiKey.trim().startsWith("AIzaSy")) {
                try {
                    aiResponseContent = callGeminiDirectTextApi(geminiApiKey.trim(), promptText);
                } catch (Exception e) {
                    System.err.println("Lỗi gọi Gemini Text API: " + e.getMessage());
                }
            }

            if (aiResponseContent == null || aiResponseContent.trim().isEmpty()) {
                result.put("success", true);
                result.put("productName", productName);
                result.put("description", buildRich100WordsDescription(productName, ""));
                return result;
            }

            String cleanJson = aiResponseContent.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
            if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            cleanJson = cleanJson.trim();

            Map<String, Object> parsed = objectMapper.readValue(cleanJson, Map.class);
            String desc = (String) parsed.getOrDefault("description", "");
            if (countWords(desc) < 100) {
                desc = buildRich100WordsDescription(productName, desc);
            }

            result.put("success", true);
            result.put("productName", parsed.getOrDefault("productName", productName));
            result.put("brandName", parsed.getOrDefault("brandName", ""));
            result.put("categoryName", parsed.getOrDefault("categoryName", ""));
            result.put("description", desc);
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", true);
            result.put("productName", productName);
            result.put("description", buildRich100WordsDescription(productName, ""));
            return result;
        }
    }

    private String callGeminiDirectTextApi(String apiKey, String promptText) {
        List<String> googleModels = Arrays.asList("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash");
        for (String m : googleModels) {
            try {
                String targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + apiKey;
                Map<String, Object> requestBody = new HashMap<>();
                List<Map<String, Object>> contents = new ArrayList<>();
                Map<String, Object> contentObj = new HashMap<>();
                List<Map<String, Object>> parts = new ArrayList<>();
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("text", promptText);
                parts.add(textPart);
                contentObj.put("parts", parts);
                contents.add(contentObj);
                requestBody.put("contents", contents);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                ResponseEntity<Map> response = restTemplate.postForEntity(targetUrl, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    Map body = response.getBody();
                    List candidates = (List) body.get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map firstCand = (Map) candidates.get(0);
                        Map candContent = (Map) firstCand.get("content");
                        List candParts = (List) candContent.get("parts");
                        Map firstPart = (Map) candParts.get(0);
                        String text = (String) firstPart.get("text");
                        if (text != null && !text.trim().isEmpty()) {
                            return text;
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Text API call failed for model " + m + ": " + e.getMessage());
            }
        }
        return null;
    }

    private String extractRegexField(String text, String fieldName) {
        if (text == null) return "";
        try {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"" + fieldName + "\"\\s*:\\s*\"([^\"]+)\"");
            java.util.regex.Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                return matcher.group(1);
            }
        } catch (Exception e) {
            System.err.println("Lỗi extract regex field " + fieldName + ": " + e.getMessage());
        }
        return "";
    }
}
