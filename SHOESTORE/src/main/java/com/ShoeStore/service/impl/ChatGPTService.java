package com.ShoeStore.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ChatGPTService {

    @Value("${openai.api.key:}")
    private String apiKey;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RestTemplate restTemplate;

    private static final String OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions";

    public String getAIResponse(String userMessage) {
        return getAIResponse(userMessage, null);
    }

    public String getAIResponse(String userMessage, Integer userId) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return "Dạ bạn cần shop hỗ trợ thông tin gì không ạ? Hãy nhập câu hỏi để em tư vấn cho bạn nhé!";
        }

        String msg = userMessage.trim().toLowerCase();
        String cleanMsg = msg.replaceAll("[\\p{Punct}]", "").trim();

        // ----------------------------------------------------
        // 1. CHÀO HỎI ĐƠN THUẦN (Chào lại lịch sự - Instant Reply)
        // ----------------------------------------------------
        List<String> greetings = Arrays.asList(
            "helo", "hello", "hi", "chào", "chao", "alo", "hey", "chào shop", "chao shop", 
            "shop ơi", "shop oi", "ad ơi", "ad oi", "shop", "ad", "dạ", "da", "dạ chào", 
            "xin chào", "xin chao", "hi shop", "hello shop", "chào em", "chao em", "dạ hi", 
            "chào bạn", "chao ban", "alo shop", "alo ad", "ơi", "oi"
        );
        if (greetings.contains(cleanMsg) || cleanMsg.matches("^(helo+|hello+|hi+|chào|chao|alo+|dạ|da|shop)(\\s+(shop|ad|ơi|oi|bạn|ban|em))?$")) {
            return "Dạ ShoeStore xin chào bạn ạ! Cửa hàng rất vui được hỗ trợ bạn hôm nay. Bạn đang tìm mẫu giày ưng ý, tư vấn chọn size hay cần thông tin ưu đãi gì của shop ạ?";
        }

        // ----------------------------------------------------
        // 1. TỰ ĐỘNG QUÉT TOÀN BỘ CSDL DỰ ÁN & WEBPAGE LIVE THEO CÂU HỎI ĐẦU VÀO
        // ----------------------------------------------------
        Map<String, Object> projectScan = scanAndRetrieveProjectContext(userMessage, userId);

        // ----------------------------------------------------
        // 2. CHO AI LLM ENGINE (GEMINI / LLAMA / DEEPSEEK) TỰ ĐỌC, TỰ LỌC VÀ TỰ SUY NGHĨ TRẢ LỜI
        // ----------------------------------------------------
        String llmReply = callLLMEngineWithScannedContext(userMessage, userId, projectScan);
        if (llmReply != null && !llmReply.trim().isEmpty()) {
            return llmReply;
        }

        // ----------------------------------------------------
        // 3. BỘ TỔNG HỢP DỮ LIỆU ĐỘNG KHI KHÔNG CÓ KẾT NỐI API LLM
        // ----------------------------------------------------
        return generateDynamicRAGAnswer(userMessage, userId, projectScan);
    }

    /**
     * HÀM QUÉT ĐỘNG TOÀN BỘ CSDL DỰ ÁN THEO TỪ KHỎA ĐẦU VÀO
     */
    private Map<String, Object> scanAndRetrieveProjectContext(String userMessage, Integer userId) {
        Map<String, Object> result = new HashMap<>();
        if (userMessage == null) return result;

        String msg = userMessage.trim().toLowerCase();

        // 1. Quét CSDL bảng products theo Tên sản phẩm, Thương hiệu, Mô tả, Màu sắc
        try {
            String cleanTerm = msg.replaceAll("(?i)(tư vấn|hướng dẫn|một đôi|đôi|giày|giầy|dép|cho|tôi|xem|bán|mua|hãng|loại|dòng|thương hiệu|mẫu|nào|đẹp|nhiều|người)", "").trim();
            if (cleanTerm.isEmpty()) cleanTerm = msg;

            String sql = "SELECT DISTINCT TOP 6 p.id, p.product_name, p.brand_name, " +
                         "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                         "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                         "FROM products p " +
                         "LEFT JOIN product_variants pv ON p.id = pv.product_id " +
                         "LEFT JOIN colors c ON pv.color_id = c.id " +
                         "WHERE p.status = 1 " +
                         "AND (LOWER(p.product_name) LIKE ? OR LOWER(p.brand_name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(c.color_name) LIKE ?) " +
                         "ORDER BY p.id DESC";
            String searchPattern = "%" + cleanTerm + "%";
            List<Map<String, Object>> matchedProducts = jdbcTemplate.queryForList(sql, searchPattern, searchPattern, searchPattern, searchPattern);

            if (matchedProducts.isEmpty() && !cleanTerm.equals(msg)) {
                String searchPatternFull = "%" + msg + "%";
                matchedProducts = jdbcTemplate.queryForList(sql, searchPatternFull, searchPatternFull, searchPatternFull, searchPatternFull);
            }

            if (!matchedProducts.isEmpty()) {
                result.put("matchedProducts", matchedProducts);
            }
        } catch (Exception e) {}

        // 2. Quét danh sách Thương hiệu thực tế từ CSDL
        try {
            String brandSql = "SELECT DISTINCT brand_name FROM products WHERE status = 1 AND brand_name IS NOT NULL AND TRIM(brand_name) <> ''";
            List<String> allBrands = jdbcTemplate.queryForList(brandSql, String.class);
            result.put("allBrands", allBrands);

            for (String b : allBrands) {
                if (msg.contains(b.toLowerCase())) {
                    result.put("matchedBrand", b);
                    break;
                }
            }
        } catch (Exception e) {}

        // 3. Quét CSDL bảng flash_sales
        try {
            String fsSql = "SELECT TOP 4 fs.name as campaign_name, fs.start_date, fs.end_date, fsp.sale_price as price, p.id, p.product_name, " +
                           "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                           "FROM flash_sales fs JOIN flash_sale_products fsp ON fs.id = fsp.flash_sale_id JOIN products p ON fsp.product_id = p.id " +
                           "WHERE fs.end_date >= GETDATE() AND p.status = 1 ORDER BY fs.start_date ASC";
            List<Map<String, Object>> flashSales = jdbcTemplate.queryForList(fsSql);
            if (!flashSales.isEmpty()) {
                result.put("flashSales", flashSales);
            }
        } catch (Exception e) {}

        // 4. Quét CSDL bảng membership_ranks (Hạng & Ưu đãi Free ship)
        try {
            String mrSql = "SELECT rank_name, min_points, COALESCE(free_shipping, 0) as free_shipping FROM membership_ranks ORDER BY min_points ASC";
            List<Map<String, Object>> ranks = jdbcTemplate.queryForList(mrSql);
            result.put("ranks", ranks);
        } catch (Exception e) {}

        // 5. Quét CSDL bảng promotions (Mã giảm giá)
        try {
            String promoSql = "SELECT code, discount_percent, description FROM promotions WHERE status = 1 AND end_date >= GETDATE()";
            List<Map<String, Object>> promos = jdbcTemplate.queryForList(promoSql);
            if (!promos.isEmpty()) {
                result.put("promos", promos);
            }
        } catch (Exception e) {}

        // 6. Quét CSDL bảng orders (Lịch sử đơn hàng cá nhân)
        if (userId != null) {
            try {
                String orderSql = "SELECT TOP 3 o.id, o.status, o.total_amount, o.created_at FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC";
                List<Map<String, Object>> userOrders = jdbcTemplate.queryForList(orderSql, userId);
                if (!userOrders.isEmpty()) {
                    result.put("userOrders", userOrders);
                }
            } catch (Exception e) {}
        }

        // 7. Quét CSDL bảng categories (Danh mục sản phẩm)
        try {
            String catSql = "SELECT name FROM categories WHERE status = 1";
            List<String> categories = jdbcTemplate.queryForList(catSql, String.class);
            if (!categories.isEmpty()) {
                result.put("categories", categories);
            }
        } catch (Exception e) {}

        // 8. Quét CSDL bảng colors (Màu sắc có sẵn)
        try {
            String colorSql = "SELECT DISTINCT color_name FROM colors WHERE color_name IS NOT NULL AND TRIM(color_name) <> ''";
            List<String> colors = jdbcTemplate.queryForList(colorSql, String.class);
            if (!colors.isEmpty()) {
                result.put("colors", colors);
            }
        } catch (Exception e) {}

        // 9. Quét trực tiếp các tập tin giao diện & cấu hình dự án (Source Code & Live Web View Scanner)
        try {
            String sourceDocs = scanSourceFilesAndDocs(msg);
            if (sourceDocs != null && !sourceDocs.trim().isEmpty()) {
                result.put("sourceDocs", sourceDocs);
            }
        } catch (Exception e) {}

        return result;
    }

    /**
     * QUÉT TRỰC TIẾP TẬP TIN DỰ ÁN (SRC FILES, TEMPLATES, PROPERTIES & WEB COMPONENT DOCS)
     */
    private String scanSourceFilesAndDocs(String query) {
        if (query == null || query.trim().isEmpty()) return "";
        StringBuilder sb = new StringBuilder();

        try {
            java.io.File propFile = new java.io.File("src/main/resources/application.properties");
            if (propFile.exists()) {
                String content = java.nio.file.Files.readString(propFile.toPath());
                if (content.toLowerCase().contains(query.toLowerCase())) {
                    sb.append("📌 [Cấu hình application.properties]: Khớp thông tin '").append(query).append("'\n");
                }
            }
        } catch (Exception e) {}

        List<String> webFiles = Arrays.asList(
            "src/main/resources/templates/client/home.html",
            "src/main/resources/templates/client/details.html",
            "src/main/resources/templates/client/checkout.html",
            "src/main/resources/templates/client/fragments/footer.html",
            "../shoestore-web/src/components/Chatbox.jsx"
        );

        for (String filePath : webFiles) {
            try {
                java.io.File f = new java.io.File(filePath);
                if (f.exists()) {
                    String text = java.nio.file.Files.readString(f.toPath());
                    if (text.toLowerCase().contains(query.toLowerCase())) {
                        sb.append("📌 [Trang Web Live ").append(f.getName()).append("]: Khớp thông tin giao diện '").append(query).append("'\n");
                    }
                }
            } catch (Exception e) {}
        }

        return sb.toString();
    }

    private String callLLMEngineWithScannedContext(String userMessage, Integer userId, Map<String, Object> scanData) {
        String storeContext = formatScannedContextForLLM(userMessage, userId, scanData);

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            String openRouterReply = callOpenRouterApi(userMessage, storeContext);
            if (openRouterReply != null && !openRouterReply.trim().isEmpty()) {
                return openRouterReply;
            }
        }

        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            String geminiReply = callGeminiDirectApi(userMessage, storeContext);
            if (geminiReply != null && !geminiReply.trim().isEmpty()) {
                return geminiReply;
            }
        }

        return null;
    }

    private String formatScannedContextForLLM(String userMessage, Integer userId, Map<String, Object> scanData) {
        StringBuilder sb = new StringBuilder();

        if (scanData.containsKey("matchedProducts")) {
            List<Map<String, Object>> prods = (List<Map<String, Object>>) scanData.get("matchedProducts");
            sb.append("--- SẢN PHẨM KHỚP VỚI CÂU HỎI ---\n");
            for (Map<String, Object> p : prods) {
                Object priceObj = p.get("price");
                long priceVal = priceObj instanceof Number ? ((Number) priceObj).longValue() : 0;
                String img = p.get("image") != null ? p.get("image").toString().trim() : "";
                if (!img.isEmpty() && !img.startsWith("http://") && !img.startsWith("https://") && !img.startsWith("data:")) {
                    if (!img.startsWith("/")) img = "/" + img;
                    if (!img.startsWith("/images/") && !img.startsWith("/uploads/")) img = "/images" + img;
                }
                sb.append(String.format("ID: %s, Tên: %s, Hãng: %s, Giá: %,dđ, Card: [PRODUCT:%s|%s|%d|%s]\n",
                        p.get("id"), p.get("product_name"), p.get("brand_name"), priceVal, p.get("id"), p.get("product_name"), priceVal, img));
            }
        }

        if (scanData.containsKey("allBrands")) {
            List<String> brands = (List<String>) scanData.get("allBrands");
            sb.append("\nTHƯƠNG HIỆU ĐANG CÓ TẠI CỬA HÀNG: ").append(String.join(", ", brands)).append("\n");
        }

        if (scanData.containsKey("categories")) {
            List<String> cats = (List<String>) scanData.get("categories");
            sb.append("\nDANH MỤC SẢN PHẨM: ").append(String.join(", ", cats)).append("\n");
        }

        if (scanData.containsKey("colors")) {
            List<String> colors = (List<String>) scanData.get("colors");
            sb.append("\nMÀU SẮC SẢN PHẨM CÓ SẴN: ").append(String.join(", ", colors)).append("\n");
        }

        if (scanData.containsKey("ranks")) {
            List<Map<String, Object>> ranks = (List<Map<String, Object>>) scanData.get("ranks");
            sb.append("\n--- BẢNG HẠNG THÀNH VIÊN ---\n");
            for (Map<String, Object> r : ranks) {
                boolean fs = false;
                Object fsObj = r.get("free_shipping");
                if (fsObj instanceof Boolean) fs = (Boolean) fsObj;
                else if (fsObj instanceof Number) fs = ((Number) fsObj).intValue() == 1;
                sb.append(String.format("Hạng %s (%s điểm): FreeShip = %s\n", r.get("rank_name"), r.get("min_points"), fs ? "CÓ" : "KHÔNG"));
            }
        }

        if (scanData.containsKey("sourceDocs")) {
            sb.append("\n--- DỮ LIỆU DỰ ÁN & WEBPAGE LIVE ---\n")
              .append(scanData.get("sourceDocs")).append("\n");
        }

        sb.append("\n--- CHÍNH SÁCH SHOESTORE ---\n");
        sb.append("• Đổi trả hàng: Đổi trả trong 7 ngày kể từ khi nhận hàng đối với sản phẩm còn nguyên tem mác, hộp và chưa qua sử dụng.\n");
        sb.append("• Bảo hành: Bảo hành keo, chỉ, đế 6 tháng miễn phí cho tất cả sản phẩm.\n");
        sb.append("• Thanh toán: COD (khi nhận hàng) và Quét mã QR PayOS/VNPAY.\n");
        sb.append("• Giao hàng: Giao hàng toàn quốc. Phí ship tính tự động tại trang Thanh Toán.\n");

        return sb.toString();
    }

    private String callOpenRouterApi(String userMessage, String storeContext) {
        List<Map<String, String>> messages = new ArrayList<>();
        String systemInstructions = "Bạn là Chuyên gia tư vấn thời trang & Trợ lý bán hàng thông minh của cửa hàng giày ShoeStore.\n"
                + "NHIỆM VỤ CỦA BẠN:\n"
                + "Đọc kỹ câu hỏi đầu vào của khách hàng và TỰ SUY NGHĨ, TỰ PHÂN LOẠI Ý ĐỊNH (Intent):\n\n"
                + "1. NẾU CÂU HỎI KHÔNG LIÊN QUAN ĐẾN CỬA HÀNG (ví dụ: hỏi bánh mì, phở, trà sữa, đồ ăn, nước uống, xe cộ, điện thoại, quần áo, chứng khoán, thời tiết...):\n"
                + "   BẮT BUỘC trả lời chính xác câu từ chối sau: 'Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các thông tin liên quan đến sản phẩm giày dép, chính sách mua bán, giao hàng và khuyến mãi của shop thôi ạ.'\n\n"
                + "2. NẾU CÂU HỎI LIÊN QUAN ĐẾN CỬA HÀNG (sản phẩm, giá cả, mẫu đẹp, bán chạy, khuyến mãi, flash sale, chọn size, bảo hành, đổi trả, đơn hàng...):\n"
                + "   Hãy sử dụng DỮ LIỆU CỬA HÀNG THỜI GIAN THỰC được cung cấp dưới đây để suy nghĩ và tư vấn chi tiết, lịch sự (3-4 câu).\n"
                + "   Khi nhắc đến các sản phẩm phù hợp, hãy kèm thẻ [PRODUCT:id|name|price|image] dựa trên danh sách có sẵn ở trên.\n"
                + "3. Trả lời bằng Tiếng Việt tự nhiên. Tuyệt đối KHÔNG dùng các từ kỹ thuật lập trình như 'CSDL', 'database', 'bảng SQL'.\n\n"
                + "DỮ LIỆU CỬA HÀNG THỜI GIAN THỰC:\n"
                + storeContext;

        messages.add(Map.of("role", "system", "content", systemInstructions));
        messages.add(Map.of("role", "user", "content", userMessage));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        headers.set("HTTP-Referer", "http://localhost:8080");
        headers.set("X-Title", "ShoeStore Assistant");

        List<String> models = Arrays.asList(
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "google/gemini-flash-1.5-exp:free",
            "mistralai/mistral-7b-instruct:free",
            "openrouter/auto"
        );

        for (String model : models) {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_URL, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    List choices = (List) response.getBody().get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map firstChoice = (Map) choices.get(0);
                        Map msgObj = (Map) firstChoice.get("message");
                        if (msgObj != null && msgObj.containsKey("content")) {
                            String content = (String) msgObj.get("content");
                            if (content != null && !content.trim().isEmpty()) {
                                return content.trim();
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("OpenRouter Model (" + model + ") Fail: " + e.getMessage());
            }
        }
        return null;
    }

    private String callGeminiDirectApi(String userMessage, String storeContext) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey.trim();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String promptText = "Bạn là Trợ lý AI của cửa hàng giày ShoeStore. Đọc kỹ câu hỏi: '" + userMessage + "'\n"
                              + "Nhiệm vụ: TỰ PHÂN LOẠI CÂU HỎI.\n"
                              + "1. Nếu KHÔNG LIÊN QUAN đến cửa hàng (bánh mì, phở, đồ ăn, trà sữa, xe cộ...) ➔ BẮT BUỘC trả lời chính xác câu từ chối: 'Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các thông tin liên quan đến sản phẩm giày dép, chính sách mua bán, giao hàng và khuyến mãi của shop thôi ạ.'\n"
                              + "2. Nếu LIÊN QUAN đến cửa hàng ➔ Trả lời chi tiết bằng Tiếng Việt dựa trên dữ liệu dưới đây, kèm thẻ [PRODUCT:id|name|price|image] nếu có sản phẩm phù hợp.\n"
                              + "Dữ liệu Cửa Hàng thời gian thực:\n" + storeContext;

            Map<String, Object> textPart = Map.of("text", promptText);
            Map<String, Object> contentObj = Map.of("parts", List.of(textPart));
            Map<String, Object> requestBody = Map.of("contents", List.of(contentObj));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map firstCand = (Map) candidates.get(0);
                    Map content = (Map) firstCand.get("content");
                    if (content != null && content.containsKey("parts")) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map firstPart = (Map) parts.get(0);
                            if (firstPart != null && firstPart.containsKey("text")) {
                                return (String) firstPart.get("text");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Gemini Direct API Fail: " + e.getMessage());
        }
        return null;
    }

    private String generateDynamicRAGAnswer(String userMessage, Integer userId, Map<String, Object> scanData) {
        String msg = userMessage.trim().toLowerCase();

        // 1. NẾU QUÉT RA SẢN PHẨM KHỚP TRỰC TIẾP
        if (scanData.containsKey("matchedProducts")) {
            List<Map<String, Object>> matched = (List<Map<String, Object>>) scanData.get("matchedProducts");
            if (!matched.isEmpty()) {
                return "Dạ ShoeStore xin gửi bạn các mẫu sản phẩm phù hợp với yêu cầu của bạn ạ:" + buildProductCardsString(matched);
            }
        }

        // 2. NẾU HỎI THƯƠNG HIỆU CỤ THỂ
        List<String> knownBrands = Arrays.asList("nike", "adidas", "jordan", "puma", "converse", "vans", "new balance", "reebok", "mlb", "crocs");
        String matchedBrand = knownBrands.stream().filter(msg::contains).findFirst().orElse(null);
        if (matchedBrand != null) {
            List<Map<String, Object>> prods = getProductsFromDB(null, matchedBrand, null, 4);
            if (!prods.isEmpty()) {
                String brandCap = matchedBrand.substring(0, 1).toUpperCase() + matchedBrand.substring(1);
                return "Dạ đây là các mẫu sản phẩm nổi bật của thương hiệu **" + brandCap + "** đang có sẵn tại ShoeStore ạ:" + buildProductCardsString(prods);
            }
        }

        // 3. NẾU HỎI MẪU ĐẸP / BÁN CHẠY / NHIỀU NGƯỜI MUA
        if (msg.contains("đẹp") || msg.contains("bán chạy") || msg.contains("nhiều người") || msg.contains("nhiều người mua") || msg.contains("hot") || msg.contains("ưa chuộng")) {
            List<Map<String, Object>> prods = getProductsFromDB(null, null, null, 4);
            if (!prods.isEmpty()) {
                return "Dạ đây là các mẫu giày bán chạy nhất và được nhiều khách hàng đánh giá cao nhất tại ShoeStore ạ:" + buildProductCardsString(prods);
            }
        }

        // 4. DANH SÁCH THƯƠNG HIỆU CHUNG
        if (msg.contains("các hãng") || msg.contains("những hãng") || msg.contains("danh sách hãng") || msg.contains("hãng nào") || msg.contains("thương hiệu nào")) {
            return getStoreBrandsResponse();
        }

        // 5. GIÁ CẢ
        if (msg.contains("giá") || msg.contains("nhiêu") || msg.contains("bao nhiêu") || msg.contains("tiền")) {
            return getStorePriceRangeResponse();
        }

        // 6. HÀNG CHÍNH HÃNG
        if (msg.contains("chính hãng") || msg.contains("real") || msg.contains("fake") || msg.contains("hàng thật") || msg.contains("uy tín")) {
            return "Dạ ShoeStore cam kết 100% tất cả sản phẩm bán ra đều là **HÀNG CHÍNH HÃNG** full box, đầy đủ phụ kiện. Shop cam kết đền tiền gấp 10 lần nếu khách phát hiện hàng giả hàng nhái ạ!";
        }

        // 7. ĐỔI TRẢ HÀNG
        if (msg.contains("đổi trả") || msg.contains("trả hàng") || msg.contains("đổi hàng") || msg.contains("hoàn tiền") || msg.contains("đổi size") || msg.contains("đổi mẫu")) {
            return "Dạ ShoeStore hỗ trợ đổi trả sản phẩm trong vòng 7 ngày kể từ khi nhận hàng đối với sản phẩm còn nguyên tem mác, nguyên hộp và chưa qua sử dụng ạ. Bạn có thể gửi yêu cầu đổi size/đổi mẫu trực tiếp tại trang Lịch Sử Đơn Hàng nhé!";
        }

        // 8. BẢO HÀNH
        if (msg.contains("bảo hành") || msg.contains("keo") || msg.contains("hỏng") || msg.contains("lỗi sản phẩm") || msg.contains("chỉ")) {
            return "Dạ tất cả sản phẩm mua tại ShoeStore đều được bảo hành keo, chỉ và đế miễn phí trong vòng 6 tháng. Bạn chỉ cần mang sản phẩm hoặc cung cấp mã đơn hàng để shop hỗ trợ bảo hành chu đáo ạ!";
        }

        // 9. THANH TOÁN
        if (msg.contains("thanh toán") || msg.contains("chuyển khoản") || msg.contains("cod") || msg.contains("payos") || msg.contains("vnpay") || msg.contains("qr")) {
            return "Dạ ShoeStore hỗ trợ 2 hình thức thanh toán vô cùng tiện lợi:\n1. Thanh toán khi nhận hàng (COD).\n2. Thanh toán trực tuyến quét mã QR qua cổng PayOS/VNPAY rất an toàn và nhanh chóng ạ!";
        }

        // 10. SIZE GIÀY & CM
        Pattern sizePattern = Pattern.compile("(\\d{2}(\\.\\d)?)\\s*(cm|centimet|săng ti|xentimét)?");
        Matcher sizeMatcher = sizePattern.matcher(msg);
        if (msg.contains("cm") || (msg.contains("chân") && sizeMatcher.find())) {
            if (sizeMatcher.find()) {
                try {
                    double cm = Double.parseDouble(sizeMatcher.group(1));
                    if (cm >= 20.0 && cm <= 32.0) {
                        return handleSizeRecommendation(cm);
                    }
                } catch (Exception e) {}
            }
        }

        if (msg.contains("hướng dẫn chọn size") || msg.contains("bảng size") || msg.contains("chọn size") || msg.contains("đo size") || msg.contains("size")) {
            return "Dạ cách chọn size giày chuẩn tại ShoeStore:\n" +
                   "• Bạn dùng thước đo chiều dài bàn chân (cm) từ gót chân đến đầu ngón dài nhất.\n" +
                   "• Bảng quy đổi chuẩn: Chân 23cm (Size 37), 24cm (Size 39), 24.5cm (Size 40), 25cm (Size 41), 26cm (Size 42).\n" +
                   "Nếu bạn có số đo cm cụ thể (ví dụ: 'chân 24.5cm'), hãy gõ số đo để em chọn size chuẩn kèm sản phẩm còn sẵn cho bạn nhé!";
        }

        // 11. TRA CỨU ĐƠN HÀNG
        if (msg.contains("đơn hàng") || msg.contains("đơn của tôi") || msg.contains("giao chưa") || msg.contains("đơn #")) {
            return getUserOrderResponse(userId);
        }

        // 12. HẠNG THÀNH VIÊN
        if (msg.contains("hạng") || msg.contains("thành viên") || msg.contains("tích điểm") || msg.contains("kim cương")) {
            return getMembershipRankResponse(userId);
        }

        // 13. SHIP & ĐỊA CHỈ
        if (msg.contains("phí giao hàng") || msg.contains("phí ship") || msg.contains("vận chuyển")) {
            return getShippingPolicyResponse(userId);
        }
        if (msg.contains("ở đâu") || msg.contains("địa chỉ") || msg.contains("cửa hàng") || msg.contains("địa điểm")) {
            return "Dạ hệ thống ShoeStore hỗ trợ bán hàng online giao hàng toàn quốc và hỗ trợ trải nghiệm sản phẩm trực tiếp tại cửa hàng. Bạn có thể xem chi tiết địa chỉ ở chân trang (footer) website nhé!";
        }

        // 14. FLASH SALE & VOUCHER & KHUYẾN MÃI
        if (msg.contains("khuyến mãi") || msg.contains("khuyen mai") || msg.contains("flash sale") || msg.contains("flashsale") || msg.contains("chương trình sale") || msg.contains("đang sale") || msg.contains("ưu đãi") || msg.contains("uu dai") || msg.contains("giảm giá")) {
            String flashResp = getFlashSaleResponse();
            if (flashResp != null && !flashResp.contains("chưa có")) {
                return flashResp;
            }
            return getPromotionResponse();
        }
        if (msg.contains("voucher") || msg.contains("mã giảm giá") || msg.contains("mã khuyến mãi")) {
            return getPromotionResponse();
        }

        // 15. TƯ VẤN PHỐI ĐỒ
        if (msg.contains("chạy bộ") || msg.contains("thể thao") || msg.contains("đi làm") || msg.contains("đi chơi") || msg.contains("phối") || msg.contains("quần jean") || msg.contains("quần tây")) {
            return getStyleAdviceResponse(msg);
        }

        // 16. NẾU CÂU HỎI CÓ LIÊN QUAN ĐẾN SẢN PHẨM / XEM MẪU ➔ HIỂN THỊ CÁC MẪU NỔI BẬT
        if (msg.contains("mẫu") || msg.contains("giày") || msg.contains("dép") || msg.contains("sneaker") || msg.contains("bán") || msg.contains("mua") || msg.contains("xem") || msg.contains("tư vấn") || msg.contains("thương hiệu")) {
            List<Map<String, Object>> prods = getProductsFromDB(null, null, null, 4);
            return "Dạ ShoeStore xin gửi bạn gợi ý các mẫu sản phẩm hot đang có sẵn tại cửa hàng ạ. Bạn cần em hỗ trợ thêm thông tin cụ thể nào cứ nhắn em nhé:" + buildProductCardsString(prods);
        }

        // 17. NẾU CÂU HỎI KHÔNG LIÊN QUAN ĐẾN CỬA HÀNG (BÁNH MÌ, ĐỒ ĂN...) ➔ XUẤT CÂU TỪ CHỐI
        return "Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các thông tin liên quan đến sản phẩm giày dép, chính sách mua bán, giao hàng và khuyến mãi của shop thôi ạ.";
    }

    public String getStoreBrandsResponse() {
        try {
            String sql = "SELECT DISTINCT brand_name FROM products WHERE status = 1 AND brand_name IS NOT NULL AND TRIM(brand_name) <> ''";
            List<String> brands = jdbcTemplate.queryForList(sql, String.class);
            if (!brands.isEmpty()) {
                String brandList = String.join(", ", brands);
                return "Dạ hiện tại cửa hàng ShoeStore đang phân phối các sản phẩm chính hãng từ các thương hiệu nổi tiếng bao gồm: **" + brandList + "** ạ! Bạn muốn tư vấn hoặc xem mẫu của thương hiệu nào thì nhắn em nhé!";
            }
        } catch (Exception e) {}
        return "Dạ hiện tại ShoeStore phân phối chính hãng các thương hiệu nổi tiếng như: **Nike, Adidas, Air Jordan, Puma, Vans, Converse, New Balance** ạ! Bạn chọn thương hiệu nào để em tư vấn mẫu nhé!";
    }

    public String getStorePriceRangeResponse() {
        try {
            String sql = "SELECT MIN(price) as min_price, MAX(price) as max_price FROM product_variants";
            Map<String, Object> map = jdbcTemplate.queryForMap(sql);
            long minP = map.get("min_price") instanceof Number ? ((Number) map.get("min_price")).longValue() : 450000;
            long maxP = map.get("max_price") instanceof Number ? ((Number) map.get("max_price")).longValue() : 2500000;
            return String.format("Dạ các sản phẩm giày dép tại ShoeStore có mức giá rất đa dạng, dao động từ khoảng **%,d ₫** đến **%,d ₫** tùy thuộc vào dòng sản phẩm và thương hiệu ạ. Bạn có thể tìm giày theo khoảng giá mong muốn nhé!", minP, maxP);
        } catch (Exception e) {
            return "Dạ các sản phẩm tại ShoeStore có mức giá dao động từ khoảng 450.000 ₫ đến 2.500.000 ₫ tùy thuộc vào thương hiệu và mẫu mã ạ!";
        }
    }

    public String getMembershipRankResponse(Integer userId) {
        try {
            String sql = "SELECT rank_name, min_points, COALESCE(discount_percent, 0) as discount_percent, COALESCE(free_shipping, 0) as free_shipping FROM membership_ranks ORDER BY min_points ASC";
            List<Map<String, Object>> ranks = jdbcTemplate.queryForList(sql);

            if (ranks.isEmpty()) {
                return "Dạ chính sách giao hàng của ShoeStore được tính tự động tại trang Thanh Toán tùy theo khu vực nhận hàng ạ!";
            }

            StringBuilder sb = new StringBuilder("Dạ đây là thông tin các Hạng Thành Viên & Chính sách ưu đãi thực tế tại ShoeStore ạ:\n\n");
            for (Map<String, Object> r : ranks) {
                String name = r.get("rank_name") != null ? r.get("rank_name").toString() : "Thành viên";
                int minPts = r.get("min_points") != null ? ((Number) r.get("min_points")).intValue() : 0;
                boolean isFreeShip = false;
                Object fsObj = r.get("free_shipping");
                if (fsObj instanceof Boolean) {
                    isFreeShip = (Boolean) fsObj;
                } else if (fsObj instanceof Number) {
                    isFreeShip = ((Number) fsObj).intValue() == 1;
                }

                String shipText = isFreeShip ? "🎁 Miễn phí giao hàng" : "Phí ship tính theo khu vực";
                sb.append(String.format("• **Hạng %s** (%d điểm): %s\n", name, minPts, shipText));
            }

            if (userId != null) {
                try {
                    String userSql = "SELECT a.full_name, COALESCE(a.points, 0) as points, COALESCE(r.rank_name, 'Đồng') as rank_name, COALESCE(r.free_shipping, 0) as free_shipping " +
                                     "FROM accounts a LEFT JOIN membership_ranks r ON a.membership_rank_id = r.id WHERE a.id = ?";
                    Map<String, Object> userMap = jdbcTemplate.queryForMap(userSql, userId);
                    int pts = userMap.get("points") != null ? ((Number) userMap.get("points")).intValue() : 0;
                    String myRank = userMap.get("rank_name") != null ? userMap.get("rank_name").toString() : "Đồng";
                    boolean myFreeShip = false;
                    Object mfsObj = userMap.get("free_shipping");
                    if (mfsObj instanceof Boolean) myFreeShip = (Boolean) mfsObj;
                    else if (mfsObj instanceof Number) myFreeShip = ((Number) mfsObj).intValue() == 1;

                    sb.append(String.format("\n📌 **Tài khoản của bạn**: Hiện đang có **%d điểm** - Hạng **%s** (%s).",
                            pts, myRank, myFreeShip ? "Được Miễn Phí Ship!" : "Chưa có ưu đãi Miễn Phí Ship"));
                } catch (Exception e) {}
            }

            return sb.toString();
        } catch (Exception e) {
            return "Dạ chính sách giao hàng của ShoeStore được tính tự động tại trang Thanh Toán tùy theo địa chỉ của bạn ạ!";
        }
    }

    public String getShippingPolicyResponse(Integer userId) {
        try {
            String sql = "SELECT rank_name FROM membership_ranks WHERE free_shipping = 1 ORDER BY min_points ASC";
            List<Map<String, Object>> freeShipRanks = jdbcTemplate.queryForList(sql);

            if (freeShipRanks.isEmpty()) {
                return "Dạ ShoeStore hỗ trợ giao hàng toàn quốc! Phí giao hàng sẽ được tính tự động tại trang Thanh Toán tùy theo khu vực nhận hàng của bạn ạ.";
            } else {
                String rankNames = freeShipRanks.stream()
                        .map(r -> r.get("rank_name").toString())
                        .collect(Collectors.joining(", "));
                return "Dạ ShoeStore hỗ trợ giao hàng toàn quốc! Đặc biệt, khách hàng đạt **Hạng " + rankNames + "** sẽ được **Miễn Phí Giao Hàng** cho đơn hàng ạ. Các hạng khác phí ship tính theo khu vực nhận hàng.";
            }
        } catch (Exception e) {
            return "Dạ ShoeStore hỗ trợ giao hàng toàn quốc! Phí giao hàng được tính tự động tại trang Thanh Toán tùy theo địa chỉ nhận hàng ạ.";
        }
    }

    private String handleSizeRecommendation(double cm) {
        int recommendedSize = 40;
        if (cm < 22.5) recommendedSize = 36;
        else if (cm <= 23.0) recommendedSize = 37;
        else if (cm <= 23.8) recommendedSize = 38;
        else if (cm <= 24.4) recommendedSize = 39;
        else if (cm <= 25.0) recommendedSize = 40;
        else if (cm <= 25.8) recommendedSize = 41;
        else if (cm <= 26.5) recommendedSize = 42;
        else if (cm <= 27.2) recommendedSize = 43;
        else recommendedSize = 44;

        List<Map<String, Object>> prods = getProductsByAvailableSize(recommendedSize);
        String cardsStr = buildProductCardsString(prods);

        return String.format("Dạ chiều dài chân %.1f cm ứng với **Size %d** chuẩn Việt Nam ạ! Dưới đây là các mẫu giày đang còn sẵn Size %d tại ShoeStore để bạn chọn nhé:%s",
                cm, recommendedSize, recommendedSize, cardsStr);
    }

    private List<Map<String, Object>> getProductsByAvailableSize(int sizeNum) {
        try {
            String sql = "SELECT DISTINCT TOP 4 p.id, p.product_name, p.brand_name, " +
                         "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                         "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                         "FROM products p " +
                         "JOIN product_variants pv ON p.id = pv.product_id " +
                         "JOIN sizes s ON pv.size_id = s.id " +
                         "WHERE p.status = 1 AND pv.quantity > 0 AND (s.size_name LIKE ? OR s.size_name LIKE ?) " +
                         "ORDER BY p.id DESC";
            String sizeStr1 = String.valueOf(sizeNum);
            String sizeStr2 = "%" + sizeNum + "%";
            return jdbcTemplate.queryForList(sql, sizeStr1, sizeStr2);
        } catch (Exception e) {
            return getProductsFromDB(null, null, null, 4);
        }
    }

    private String getUserOrderResponse(Integer userId) {
        if (userId == null) {
            return "Dạ bạn vui lòng **Đăng nhập tài khoản** để shop hỗ trợ kiểm tra trực tiếp trạng thái đơn hàng thời gian thực của bạn nhé!";
        }

        try {
            String sql = "SELECT TOP 3 o.id, o.status, o.total_amount, o.created_at, " +
                         "COALESCE((SELECT TOP 1 p.product_name FROM order_items oi JOIN product_variants pv ON oi.product_variant_id = pv.id JOIN products p ON pv.product_id = p.id WHERE oi.order_id = o.id), 'Sản phẩm ShoeStore') as item_name " +
                         "FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC";

            List<Map<String, Object>> orders = jdbcTemplate.queryForList(sql, userId);
            if (orders.isEmpty()) {
                return "Dạ bạn chưa có đơn hàng nào tại ShoeStore. Bạn hãy dạo một vòng cửa hàng để chọn đôi giày ưng ý nhất nhé!";
            }

            StringBuilder sb = new StringBuilder("Dạ đây là thông tin các đơn hàng gần đây của bạn tại ShoeStore ạ:\n\n");
            for (Map<String, Object> o : orders) {
                int status = o.get("status") != null ? ((Number) o.get("status")).intValue() : 0;
                String statusStr = switch (status) {
                    case 0 -> "⏳ Chờ xác nhận";
                    case 1 -> "✅ Đã xác nhận (Đang chuẩn bị hàng)";
                    case 2 -> "🚚 Đang giao hàng";
                    case 3 -> "🎉 Giao thành công";
                    case 4 -> "❌ Đã hủy";
                    default -> "Chờ xử lý";
                };
                Object totalObj = o.get("total_amount");
                long total = totalObj instanceof Number ? ((Number) totalObj).longValue() : 0;

                sb.append(String.format("• **Đơn hàng #%s** (%s)\n  Sản phẩm: %s\n  Tổng tiền: %,d ₫ | Trạng thái: %s\n\n",
                        o.get("id"), statusStr, o.get("item_name"), total, statusStr));
            }
            return sb.toString().trim();
        } catch (Exception e) {
            return "Dạ hiện tại hệ thống đang kiểm tra đơn hàng của bạn. Bạn vui lòng xem chi tiết tại trang Lịch sử mua hàng nhé!";
        }
    }

    private String getStyleAdviceResponse(String msg) {
        if (msg.contains("chạy bộ") || msg.contains("thể thao")) {
            List<Map<String, Object>> prods = getProductsFromDB(null, null, "running", 4);
            if (prods.isEmpty()) prods = getProductsFromDB(null, null, null, 4);
            return "Dạ đối với mục đích chạy bộ và tập luyện thể thao, bạn nên chọn các đôi giày có đệm êm, độ nảy tốt và thoáng khí (như Nike Air hoặc Adidas Boost) để bảo vệ cổ chân tốt nhất nhé!" + buildProductCardsString(prods);
        }

        if (msg.contains("đi làm") || msg.contains("quần tây")) {
            List<Map<String, Object>> prods = getProductsFromDB(null, null, "leather", 4);
            if (prods.isEmpty()) prods = getProductsFromDB(null, null, null, 4);
            return "Dạ khi đi làm hoặc phối với quần tây, các mẫu Sneaker tối giản màu trắng/đen hoặc chất liệu da sẽ mang lại vẻ lịch sự, thanh lịch và rất sang trọng ạ!" + buildProductCardsString(prods);
        }

        List<Map<String, Object>> prods = getProductsFromDB(null, null, null, 4);
        return "Dạ để phối với quần Jean hoặc đồ đi chơi hằng ngày, những mẫu giày dáng Classic như Nike Air Force 1, Jordan 1, Vans hay Converse là sự lựa chọn số 1 vô cùng trẻ trung và năng động ạ!" + buildProductCardsString(prods);
    }

    public List<Map<String, Object>> getProductsFromDB(String sortOrder, String brandPattern, String searchPattern, int limit) {
        try {
            StringBuilder sql = new StringBuilder(
                "SELECT TOP " + limit + " p.id, p.product_name, p.brand_name, " +
                "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                "FROM products p WHERE p.status = 1 "
            );

            List<Object> params = new ArrayList<>();

            if (brandPattern != null && !brandPattern.trim().isEmpty()) {
                sql.append("AND (LOWER(p.brand_name) LIKE ? OR LOWER(p.product_name) LIKE ?) ");
                String pStr = "%" + brandPattern.trim().toLowerCase() + "%";
                params.add(pStr);
                params.add(pStr);
            } else if (searchPattern != null && !searchPattern.trim().isEmpty()) {
                sql.append("AND (LOWER(p.product_name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.brand_name) LIKE ?) ");
                String pStr = "%" + searchPattern.trim().toLowerCase() + "%";
                params.add(pStr);
                params.add(pStr);
                params.add(pStr);
            }

            if ("PRICE_DESC".equalsIgnoreCase(sortOrder)) {
                sql.append("ORDER BY price DESC, p.id DESC");
            } else if ("PRICE_ASC".equalsIgnoreCase(sortOrder)) {
                sql.append("ORDER BY price ASC, p.id DESC");
            } else {
                sql.append("ORDER BY p.id DESC");
            }

            return jdbcTemplate.queryForList(sql.toString(), params.toArray());
        } catch (Exception e) {
            System.err.println("Lỗi lấy sản phẩm từ CSDL: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    public String getFlashSaleResponse() {
        try {
            String sql = "SELECT TOP 4 fs.name as campaign_name, fs.start_date, fs.end_date, fsp.sale_price as price, " +
                         "p.id, p.product_name, " +
                         "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                         "FROM flash_sales fs " +
                         "JOIN flash_sale_products fsp ON fs.id = fsp.flash_sale_id " +
                         "JOIN products p ON fsp.product_id = p.id " +
                         "WHERE fs.end_date >= GETDATE() AND p.status = 1 " +
                         "ORDER BY fs.start_date ASC, fsp.id DESC";

            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql);
            if (list.isEmpty()) {
                List<Map<String, Object>> prods = getProductsFromDB(null, null, null, 4);
                return "Dạ đây là các sản phẩm đang có chương trình ưu đãi giá tốt tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
            }

            Map<String, Object> firstRow = list.get(0);
            String campaignName = firstRow.get("campaign_name") != null ? firstRow.get("campaign_name").toString() : "Flash Sale";
            Object startDateObj = firstRow.get("start_date");

            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            boolean isLive = false;
            String startDateStr = "";

            if (startDateObj != null) {
                java.time.LocalDateTime startDt = null;
                if (startDateObj instanceof java.sql.Timestamp) {
                    startDt = ((java.sql.Timestamp) startDateObj).toLocalDateTime();
                } else if (startDateObj instanceof java.time.LocalDateTime) {
                    startDt = (java.time.LocalDateTime) startDateObj;
                }
                if (startDt != null) {
                    if (now.isAfter(startDt) || now.isEqual(startDt)) {
                        isLive = true;
                    }
                    java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                    startDateStr = startDt.format(dtf);
                }
            }

            String cards = buildProductCardsString(list);

            if (isLive) {
                return "Dạ hiện tại ShoeStore ĐANG DIỄN RA chương trình Flash Sale '" + campaignName + "' với giá giảm cực sốc! Dưới đây là các sản phẩm đang được giảm giá, bạn bấm vào để săn ngay nhé:" + cards;
            } else {
                String timeMsg = !startDateStr.isEmpty() ? " (Bắt đầu từ " + startDateStr + ")" : "";
                return "Dạ ShoeStore SẮP DIỄN RA chương trình Flash Sale '" + campaignName + "'" + timeMsg + "! Dưới đây là danh sách sản phẩm sắp được giảm giá sốc, bạn tham khảo trước nhé:" + cards;
            }
        } catch (Exception e) {
            List<Map<String, Object>> prods = getProductsFromDB(null, null, null, 4);
            return "Dạ đây là các sản phẩm ưu đãi tốt nhất tại ShoeStore ạ:" + buildProductCardsString(prods);
        }
    }

    public String getPromotionResponse() {
        try {
            String sql = "SELECT code, discount_percent, description FROM promotions WHERE status = 1 AND end_date >= GETDATE() ORDER BY id DESC";
            List<Map<String, Object>> promos = jdbcTemplate.queryForList(sql);
            if (promos.isEmpty()) {
                return "Dạ hiện tại shop đang áp dụng ưu đãi Giảm 10% (mã: SUMMER10PERCENT) cho các đơn hàng. Bạn nhập mã tại trang Thanh toán để nhận ưu đãi nhé!";
            }

            StringBuilder sb = new StringBuilder("Dạ đây là các mã giảm giá đang áp dụng tại ShoeStore ạ:\n");
            for (Map<String, Object> p : promos) {
                sb.append(String.format("• Mã %s: Giảm %s%% (%s)\n", p.get("code"), p.get("discount_percent"), p.get("description")));
            }
            sb.append("Bạn hãy nhập mã tại trang Thanh toán để nhận ưu đãi nhé!");
            return sb.toString();
        } catch (Exception e) {
            return "Dạ hiện tại ShoeStore đang có mã giảm giá 10% (SUMMER10PERCENT) tại trang Thanh toán ạ!";
        }
    }

    private String buildProductCardsString(List<Map<String, Object>> products) {
        if (products == null || products.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> p : products) {
            Object priceObj = p.get("price");
            long priceVal = 0;
            if (priceObj instanceof Number) {
                priceVal = ((Number) priceObj).longValue();
            } else if (priceObj != null) {
                try {
                    priceVal = new java.math.BigDecimal(priceObj.toString()).longValue();
                } catch (Exception e) {}
            }
            String img = p.get("image") != null ? p.get("image").toString().trim() : "";
            if (!img.isEmpty() && !img.startsWith("http://") && !img.startsWith("https://") && !img.startsWith("data:")) {
                if (!img.startsWith("/")) {
                    img = "/" + img;
                }
                if (!img.startsWith("/images/") && !img.startsWith("/uploads/")) {
                    img = "/images" + img;
                }
            }
            sb.append(String.format("\n[PRODUCT:%s|%s|%d|%s]",
                p.get("id"), p.get("product_name"), priceVal, img));
        }
        return sb.toString();
    }
}
