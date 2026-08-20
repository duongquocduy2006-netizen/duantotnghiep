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

    @Value("${openai.api.key}")
    private String apiKey;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RestTemplate restTemplate;

    private static final String OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions";

    private boolean containsWholeWord(String source, String keyword) {
        if (source == null || keyword == null) return false;
        String cleanSource = " " + source.replaceAll("[\\p{Punct}]", " ").replaceAll("\\s+", " ") + " ";
        String target = " " + keyword.trim() + " ";
        return cleanSource.toLowerCase().contains(target.toLowerCase());
    }

    public String getAIResponse(String userMessage) {
        return getAIResponse(userMessage, null);
    }

    public String getAIResponse(String userMessage, Integer userId) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return "Dạ bạn cần shop hỗ trợ thông tin gì không ạ? Hãy nhập câu hỏi để em tư vấn cho bạn nhé!";
        }

        String msg = userMessage.trim().toLowerCase();

        // ----------------------------------------------------
        // 1. CHÀO HỎI ĐƠN THUẦN (0 Tokens - Instant Reply)
        // ----------------------------------------------------
        List<String> greetings = Arrays.asList(
            "helo", "hello", "hi", "chào", "chao", "alo", "hey", "chào shop", "chao shop", 
            "shop ơi", "shop oi", "ad ơi", "ad oi", "shop", "ad", "dạ", "da", "dạ chào", 
            "xin chào", "xin chao", "hi shop", "hello shop"
        );
        if (greetings.contains(msg) || msg.matches("^(helo+|hello+|hi+|chào|alo+)(\\s+shop)?$")) {
            return "Dạ chào bạn! Trợ lý AI ShoeStore rất vui được hỗ trợ bạn. Bạn cần tư vấn về mẫu sản phẩm, chọn size, kiểm tra đơn hàng hay chương trình khuyến mãi gì của shop ạ?";
        }

        // ----------------------------------------------------
        // 2. CHỨC NĂNG 1: TƯ VẤN SIZE THEO CHIỀU DÀI CHÂN (CM)
        // ----------------------------------------------------
        Pattern sizePattern = Pattern.compile("(\\d{2}(\\.\\d)?)\\s*(cm|centimet|săng ti|xentimét)?");
        Matcher sizeMatcher = sizePattern.matcher(msg);
        if (msg.contains("cm") || msg.contains("chân") || msg.contains("size") || msg.contains("chiều dài")) {
            if (sizeMatcher.find()) {
                try {
                    double cm = Double.parseDouble(sizeMatcher.group(1));
                    if (cm >= 20.0 && cm <= 32.0) {
                        return handleSizeRecommendation(cm);
                    }
                } catch (Exception e) {}
            }
        }

        // ----------------------------------------------------
        // 3. CHỨC NĂNG 2: TRA CỨU ĐƠN HÀNG CÁ NHÂN REAL-TIME
        // ----------------------------------------------------
        if (msg.contains("đơn hàng") || msg.contains("đơn của tôi") || msg.contains("giao chưa") || msg.contains("đơn #") || msg.contains("tra cứu đơn")) {
            return getUserOrderResponse(userId);
        }

        // ----------------------------------------------------
        // 4. CHỨC NĂNG 3: FLASH SALE & KHUYẾN MÃI TỰ ĐỘNG DỰA TRÊN CSDL
        // ----------------------------------------------------
        if (msg.contains("flash sale") || msg.contains("flashsale") || msg.contains("chương trình sale") || msg.contains("sale nào") || msg.contains("đang sale")) {
            return getFlashSaleResponse();
        }
        if (msg.contains("voucher") || msg.contains("mã giảm giá") || msg.contains("mã khuyến mãi") || msg.contains("khuyến mãi") || msg.contains("giam gia")) {
            return getPromotionResponse();
        }

        // ----------------------------------------------------
        // 5. CHỨC NĂNG 4: TƯ VẤN PHỐI ĐỒ & MỤC ĐÍCH SỬ DỤNG
        // ----------------------------------------------------
        if (msg.contains("chạy bộ") || msg.contains("thể thao") || msg.contains("đi làm") || msg.contains("đi chơi") || msg.contains("phối") || msg.contains("quần jean") || msg.contains("quần tây")) {
            return getStyleAdviceResponse(msg);
        }

        // ----------------------------------------------------
        // 6. CHỨC NĂNG 5: TRA CỨU SẢN PHẨM THEO GIÁ (ĐẮT NHẤT / RẺ NHẤT / HÃNG)
        // ----------------------------------------------------

        // A. Sản phẩm đắt nhất / giá cao nhất
        if (msg.contains("đắt nhất") || msg.contains("dat nhat") || msg.contains("giá cao nhất") || msg.contains("gia cao nhat") || msg.contains("cao nhất")) {
            List<Map<String, Object>> prods = getProductsFromDB("PRICE_DESC", null, null, 4);
            if (!prods.isEmpty()) {
                return "Dạ chào bạn! Đây là các mẫu sản phẩm có giá cao nhất / cao cấp nhất tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
            }
        }

        // B. Sản phẩm rẻ nhất / giá rẻ nhất
        if (msg.contains("rẻ nhất") || msg.contains("re nhat") || msg.contains("giá rẻ nhất") || msg.contains("gia re nhat") || msg.contains("giá rẻ")) {
            List<Map<String, Object>> prods = getProductsFromDB("PRICE_ASC", null, null, 4);
            if (!prods.isEmpty()) {
                return "Dạ chào bạn! Đây là các mẫu sản phẩm có giá tốt nhất / tiết kiệm nhất tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
            }
        }

        // C. Thương hiệu cụ thể (Nike, Adidas, Jordan, Puma, Vans, Converse...)
        List<String> knownBrands = Arrays.asList("nike", "adidas", "jordan", "puma", "converse", "vans", "new balance", "reebok", "mlb", "crocs");
        String matchedBrand = knownBrands.stream().filter(msg::contains).findFirst().orElse(null);
        if (matchedBrand != null) {
            List<Map<String, Object>> prods = getProductsFromDB(null, matchedBrand, null, 4);
            if (!prods.isEmpty()) {
                String brandCap = matchedBrand.substring(0, 1).toUpperCase() + matchedBrand.substring(1);
                return "Dạ chào bạn! Đây là các mẫu sản phẩm nổi bật của thương hiệu " + brandCap + " tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
            }
        }

        // D. Yêu cầu sản phẩm mới / bán chạy / mẫu mã
        List<String> productSearchKeywords = Arrays.asList(
            "sản phẩm mới nhất", "mới nhất", "mới về", "sản phẩm mới", "mẫu mới", 
            "bán chạy", "mẫu hot", "sản phẩm bán chạy", "cho xem mẫu", "xem mẫu", "các mẫu", "gợi ý mẫu", "tư vấn mẫu"
        );
        boolean isExplicitProductRequest = productSearchKeywords.stream().anyMatch(msg::contains);
        if (isExplicitProductRequest) {
            String cleanQuery = msg.replaceAll("(?i)cho\\s+xem|xem\\s+mẫu|mẫu|giày|dép|sản\\s+phẩm|có|không|tư\\s+vấn|tìm|cần|shop|ơi|gợi\\s+ý|những|nào|đẹp|hot|bán\\s+chạy|mới|nhất|của", "").trim();
            List<Map<String, Object>> prods = getProductsFromDB(null, null, cleanQuery.length() >= 2 ? cleanQuery : null, 4);
            if (!prods.isEmpty()) {
                if (msg.contains("mới")) {
                    return "Dạ chào bạn! Đây là các mẫu sản phẩm mới nhất vừa về tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
                } else {
                    return "Dạ chào bạn! Đây là các mẫu sản phẩm hot đang bán chạy nhất tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + buildProductCardsString(prods);
                }
            }
        }

        // ----------------------------------------------------
        // 7. CÂU HỎI KHÔNG LIÊN QUAN / BA LÁP BA XÀM
        // ----------------------------------------------------
        List<String> unrelatedKeywords = Arrays.asList(
            "bánh mì", "banh mi", "cơm", "com", "phở", "pho", "bún", "bun", "chè", "che",
            "trà sữa", "tra sua", "coffee", "cà phê", "ca phe", "bia", "rượu", "ruou",
            "gà", "ga", "vịt", "vit", "heo", "bò", "bo", "cá", "ca", "tôm", "tom",
            "pizza", "burger", "hamburger", "sushi", "mì", "mi", "nước", "nuoc",
            "xe máy", "xe may", "ô tô", "o to", "xe hơi", "xe hoi", "laptop", "điện thoại ip",
            "bitcoin", "tiền ảo", "chứng khoán", "chính trị", "bầu cử", "tôn giáo", "game", "phim", "nhạc", "tiktok"
        );
        List<String> shoeKeywords = Arrays.asList(
            "giày", "giay", "sneaker", "boot", "sục", "dép", "sandal", "thể thao", "nike", "adidas", "jordan", "puma", "converse", "vans"
        );
        boolean isUnrelated = unrelatedKeywords.stream().anyMatch(k -> containsWholeWord(msg, k));
        boolean hasShoeKeyword = shoeKeywords.stream().anyMatch(k -> containsWholeWord(msg, k));
        if (isUnrelated && !hasShoeKeyword) {
            return "Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các thông tin liên quan đến sản phẩm giày dép, chính sách mua bán, giao hàng và khuyến mãi của shop thôi ạ.";
        }

        // ----------------------------------------------------
        // 8. FAQ CHÍNH SÁCH VẬN CHUYỂN & HẠNG THÀNH VIÊN
        // ----------------------------------------------------
        if (msg.contains("giao hàng") || msg.contains("vận chuyển") || msg.contains("phí ship") || msg.contains("ship")) {
            return "Dạ cửa hàng ShoeStore hỗ trợ giao hàng toàn quốc! Khách hàng đạt Hạng Kim Cương sẽ được Miễn Phí Giao Hàng toàn bộ đơn hàng ạ.";
        }
        if (msg.contains("hạng") || msg.contains("thành viên") || msg.contains("tích điểm") || msg.contains("kc") || msg.contains("kim cương")) {
            return "Dạ hệ thống hạng thành viên của ShoeStore tự động tích điểm theo tổng tiền mua hàng. Khi đạt Hạng Kim Cương bạn sẽ nhận ưu đãi Miễn Phí Ship cho tất cả đơn hàng ạ!";
        }

        // ----------------------------------------------------
        // 9. GỌI OPENROUTER LLM ĐỂ SUY NGHĨ CHO CÁC CÂU HỎI PHỨC TẠP (Chain-of-Thought RAG)
        // ----------------------------------------------------
        String storeContext = getComprehensiveStoreContext(userMessage, userId);
        List<Map<String, String>> messages = new ArrayList<>();

        String systemInstructions = "Bạn là Chuyên gia tư vấn thời trang & Trợ lý bán hàng cao cấp của ShoeStore.\n"
                + "Bạn luôn suy nghĩ kỹ lưỡng, đưa ra câu tư vấn ngắn gọn, ấm áp và chính xác (2-3 câu).\n"
                + "Dưới đây là DỮ LIỆU CSDL THỜI GIAN THỰC của cửa hàng ShoeStore:\n"
                + storeContext + "\n"
                + "Nếu người dùng cần tư vấn sản phẩm, hãy đính kèm thẻ [PRODUCT:id|name|price|image] dựa theo danh sách trên.\n"
                + "Tuyệt đối KHÔNG bảo người dùng nhập ID hay hỏi ID sản phẩm.";

        messages.add(Map.of("role", "system", "content", systemInstructions));
        messages.add(Map.of("role", "user", "content", userMessage));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");

        List<String> models = Arrays.asList(
            "google/gemini-2.0-flash-exp:free",
            "deepseek/deepseek-r1:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "qwen/qwen-2.5-72b-instruct:free",
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
                            return (String) msgObj.get("content");
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi gọi AI model " + model + ": " + e.getMessage());
            }
        }

        return "Dạ hiện tại cửa hàng ShoeStore hỗ trợ tư vấn các sản phẩm giày dép và dịch vụ bán hàng. Bạn có thể chọn các câu hỏi gợi ý bên dưới để em hỗ trợ tốt nhất nhé!";
    }

    /**
     * TÍNH SIZE GIÀY THEO CM & ĐƯA RA SẢN PHẨM CÒN SẴN SIZE ĐÓ
     */
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

    /**
     * TRA CỨU ĐƠN HÀNG THỜI GIAN THỰC CHO NGƯỜI DÙNG
     */
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

    /**
     * TƯ VẤN PHỐI ĐỒ & MỤC ĐÍCH SỬ DỤNG
     */
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

    /**
     * LẤY BỐI CẢNH CSDL TOÀN DIỆN CHO LLM REASONING
     */
    private String getComprehensiveStoreContext(String userMsg, Integer userId) {
        StringBuilder sb = new StringBuilder();
        try {
            // Top products context
            String sql = "SELECT TOP 8 p.id, p.product_name, p.brand_name, " +
                         "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price, " +
                         "(SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image " +
                         "FROM products p WHERE p.status = 1 ORDER BY p.id DESC";

            List<Map<String, Object>> products = jdbcTemplate.queryForList(sql);
            sb.append("--- SẢN PHẨM ĐANG CÓ TẠI SHOP ---\n");
            for (Map<String, Object> p : products) {
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

            // Flash Sale Context
            String fsSql = "SELECT TOP 1 fs.name, fs.start_date, fs.end_date FROM flash_sales fs WHERE fs.end_date >= GETDATE() ORDER BY fs.start_date ASC";
            List<Map<String, Object>> fsList = jdbcTemplate.queryForList(fsSql);
            if (!fsList.isEmpty()) {
                sb.append("\n--- FLASH SALE TIỀM NĂNG ---\n");
                sb.append("Tên: ").append(fsList.get(0).get("name")).append(", Bắt đầu: ").append(fsList.get(0).get("start_date")).append("\n");
            }
        } catch (Exception e) {
            sb.append("Danh sách sản phẩm ShoeStore.");
        }
        return sb.toString();
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
                return "Dạ hiện tại ShoeStore chưa có chương trình Flash Sale mới nào. Bạn theo dõi trang chủ để cập nhật các đợt bùng nổ sale sắp tới nhé!";
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
            System.err.println("Lỗi tra cứu Flash Sale: " + e.getMessage());
            return "Dạ hiện tại ShoeStore có thông tin Flash Sale trên trang chủ. Bạn truy cập trang chủ để săn mã giảm giá ngay nhé!";
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
