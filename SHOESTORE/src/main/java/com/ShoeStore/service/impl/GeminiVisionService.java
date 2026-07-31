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

            // UƯ TIÊN 1: Dùng Google Gemini Direct API nếu có gemini.api.key
            if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
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
                } catch (HttpStatusCodeException e) {
                    System.err.println("Lỗi OpenRouter HTTP Status " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
                    if (e.getStatusCode().value() == 401) {
                        result.put("success", false);
                        result.put("message", "Lỗi API (401 Unauthorized): OpenRouter API Key trong application.properties đã hết hạn hoặc không tồn tại. Vui lòng cập nhật API Key mới.");
                        return result;
                    }
                    result.put("success", false);
                    result.put("message", "Lỗi kết nối AI (HTTP " + e.getStatusCode() + "): " + e.getMessage());
                    return result;
                }
            }

            if (aiResponseContent == null || aiResponseContent.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "Không thể kết nối đến dịch vụ AI. Vui lòng kiểm tra cấu hình `openai.api.key` hoặc `gemini.api.key` trong application.properties.");
                return result;
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
            "google/gemini-2.5-flash",
            "google/gemini-2.0-flash-001",
            "google/gemini-2.5-pro",
            "meta-llama/llama-4-scout:free",
            "openai/gpt-4o-mini",
            "mistralai/mistral-small-latest"
        };

        for (String modelName : candidateModels) {
            try {
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", modelName);
                requestBody.put("max_tokens", 180);

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
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.5-pro",
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
                + "  \"description\": \"Đoạn văn mô tả chi tiết, chuyên nghiệp và cuốn hút (BẮT BUỘC ĐỘ DÀI TRÊN 50 KÝ TỰ, từ 3-5 câu) về kiểu dáng, phong cách thời trang và chất liệu cao cấp của đôi giày này.\"\n"
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
                    + "Tạo ra một đoạn văn mô tả sản phẩm chi tiết, cuốn hút và cao cấp (BẮT BUỘC ĐỘ DÀI TRÊN 50 KÝ TỰ, từ 3 đến 5 câu) về kiểu dáng, phong cách thời thượng và chất liệu êm ái.\n"
                    + "Sau đó, trả về JSON chuẩn DUY NHẤT có cấu trúc:\n"
                    + "{\n"
                    + "  \"productName\": \"" + productName + "\",\n"
                    + "  \"brandName\": \"Thương hiệu dự đoán (VD: Nike, Adidas, Jordan, Puma, Vans, Converse)\",\n"
                    + "  \"categoryName\": \"Loại sản phẩm phù hợp. Chọn từ danh sách: [" + existingCatNames + "]\",\n"
                    + "  \"description\": \"Đoạn văn mô tả chi tiết trên 50 ký tự về sản phẩm này.\"\n"
                    + "}\n"
                    + "Chỉ trả về JSON thuần túy, không bao bọc bởi ```json.";

            String aiResponseContent = null;
            if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
                try {
                    aiResponseContent = callGeminiDirectTextApi(geminiApiKey.trim(), promptText);
                } catch (Exception e) {
                    System.err.println("Lỗi gọi Gemini Text API: " + e.getMessage());
                }
            }

            if (aiResponseContent == null || aiResponseContent.trim().isEmpty()) {
                result.put("success", true);
                result.put("productName", productName);
                result.put("description", productName + " sở hữu thiết kế thời thượng, phong cách hiện đại kết hợp chất liệu cao cấp giúp mang lại sự êm ái và thoải mái tối đa cho người sử dụng trong mọi hoạt động.");
                return result;
            }

            String cleanJson = aiResponseContent.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
            if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            cleanJson = cleanJson.trim();

            Map<String, Object> parsed = objectMapper.readValue(cleanJson, Map.class);
            String desc = (String) parsed.getOrDefault("description", "");
            if (desc == null || desc.trim().length() < 50) {
                desc = productName + " sở hữu thiết kế thời thượng, phong cách hiện đại kết hợp chất liệu cao cấp giúp mang lại sự êm ái và thoải mái tối đa cho người sử dụng trong mọi hoạt động hàng ngày.";
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
            result.put("description", productName + " sở hữu thiết kế thời thượng, phong cách hiện đại kết hợp chất liệu cao cấp giúp mang lại sự êm ái và thoải mái tối đa cho người sử dụng trong mọi hoạt động.");
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
