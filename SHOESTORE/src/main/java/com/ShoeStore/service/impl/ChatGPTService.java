package com.ShoeStore.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import java.util.*;
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

    /**
     * Tìm kiếm sản phẩm phù hợp từ CSDL SQL Server dựa trên từ khóa hoặc hãng sản xuất.
     */
    public List<Map<String, Object>> searchProducts(String userMsg) {
        if (userMsg == null) return Collections.emptyList();
        String msg = userMsg.trim().toLowerCase();

        // Danh sách các thương hiệu phổ biến
        List<String> knownBrands = Arrays.asList(
            "nike", "adidas", "jordan", "puma", "converse", "vans", "new balance", "reebok", "mlb", "crocs"
        );

        String targetBrand = null;
        for (String b : knownBrands) {
            if (msg.contains(b)) {
                targetBrand = b;
                break;
            }
        }

        String sql;
        List<Map<String, Object>> list;

        try {
            if (targetBrand != null) {
                // Ưu tiên 1: Tìm theo thương hiệu được nhắc đến (lấy 3 sản phẩm)
                sql = "SELECT TOP 3 p.id, p.product_name, p.brand_name, " +
                      "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                      "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                      "FROM products p " +
                      "WHERE p.status = 1 AND (LOWER(p.brand_name) LIKE ? OR LOWER(p.product_name) LIKE ?) " +
                      "ORDER BY p.id DESC";
                String pattern = "%" + targetBrand + "%";
                list = jdbcTemplate.queryForList(sql, pattern, pattern);
            } else {
                // Loại bỏ các từ thừa phổ biến để lấy từ khóa thực sự
                String cleanQuery = msg.replaceAll("(?i)cho\\s+xem|xem\\s+mẫu|mẫu|giày|dép|sản\\s+phẩm|có|không|tư\\s+vấn|tìm|cần|shop|ơi|gợi\\s+ý|những|nào|đẹp|hot|bán\\s+chạy|mới", "").trim();

                if (!cleanQuery.isEmpty() && cleanQuery.length() >= 2) {
                    sql = "SELECT TOP 5 p.id, p.product_name, p.brand_name, " +
                          "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                          "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                          "FROM products p " +
                          "WHERE p.status = 1 AND (LOWER(p.product_name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.brand_name) LIKE ?) " +
                          "ORDER BY p.id DESC";
                    String pattern = "%" + cleanQuery + "%";
                    list = jdbcTemplate.queryForList(sql, pattern, pattern, pattern);
                } else {
                    // Fallback: 5 sản phẩm mới nhất / bán chạy nhất
                    sql = "SELECT TOP 5 p.id, p.product_name, p.brand_name, " +
                          "COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = p.id), 0) as price, " +
                          "COALESCE((SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC), '') as image " +
                          "FROM products p " +
                          "WHERE p.status = 1 " +
                          "ORDER BY p.id DESC";
                    list = jdbcTemplate.queryForList(sql);
                }
            }
            return list;
        } catch (Exception e) {
            System.err.println("Lỗi truy vấn CSDL sản phẩm cho Chatbot: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Định dạng danh sách sản phẩm thành thẻ Product Card format: [PRODUCT:id|name|price|image]
     */
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

    public String getAIResponse(String userMessage) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return "Dạ bạn cần shop hỗ trợ thông tin gì không ạ? Hãy nhập câu hỏi để em tư vấn cho bạn nhé!";
        }

        String msg = userMessage.trim().toLowerCase();

        // 1. Kiểm tra câu hỏi ngoài lề (không liên quan giày dép/cửa hàng)
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
            return "Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các thông tin liên quan đến sản phẩm giày dép, chính sách mua bán, giao hàng và hỗ trợ của shop thôi ạ. Bạn vui lòng đặt câu hỏi liên quan để em tư vấn nhé!";
        }

        // 2. Chào hỏi đơn thuần
        List<String> greetings = Arrays.asList("hello", "hi", "chào", "chao", "alo", "hey", "chào shop", "shop ơi", "ad ơi");
        boolean isSimpleGreeting = greetings.stream().anyMatch(g -> msg.equals(g) || msg.equals(g + " shop"));

        // 3. Nhận diện các câu hỏi xem mẫu / xem sản phẩm / xem thương hiệu
        List<String> sampleRequests = Arrays.asList(
            "cho xem mẫu", "xem mẫu", "cho xem", "các mẫu", "có mẫu", "mẫu nào", "gợi ý", "tư vấn mẫu",
            "mẫu mới", "mẫu hot", "bán chạy", "xem giày", "cho xem sản phẩm", "co mau nao"
        );
        boolean isSampleRequest = sampleRequests.stream().anyMatch(sr -> msg.contains(sr));

        // Kiểm tra xem người dùng có nhắc đến hãng nào không
        List<String> knownBrands = Arrays.asList("nike", "adidas", "jordan", "puma", "converse", "vans", "new balance", "reebok", "mlb", "crocs");
        String matchedBrand = knownBrands.stream().filter(msg::contains).findFirst().orElse(null);

        // Tìm sản phẩm trong CSDL
        List<Map<String, Object>> matchedProducts = searchProducts(userMessage);

        // 4. XỬ LÝ TRỰC TIẾP CHO YÊU CẦU XEM MẪU / TÌM SẢN PHẨM / HÃNG
        if (isSampleRequest || matchedBrand != null || (!isSimpleGreeting && !matchedProducts.isEmpty() && (msg.contains("giày") || msg.contains("mẫu") || msg.contains("có")))) {
            if (!matchedProducts.isEmpty()) {
                String cards = buildProductCardsString(matchedProducts);
                if (matchedBrand != null) {
                    String brandCap = matchedBrand.substring(0, 1).toUpperCase() + matchedBrand.substring(1);
                    return "Dạ chào bạn! Đây là " + matchedProducts.size() + " mẫu sản phẩm nổi bật của thương hiệu " + brandCap + " tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + cards;
                } else if (isSampleRequest) {
                    return "Dạ chào bạn! Đây là các mẫu sản phẩm hot đang bán chạy nhất tại ShoeStore ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + cards;
                } else {
                    return "Dạ đây là các mẫu sản phẩm phù hợp tại ShoeStore mà bạn đang tìm ạ. Bạn bấm vào sản phẩm để xem chi tiết nhé:" + cards;
                }
            }
        }

        // Chào hỏi đơn thuần (nếu không yêu cầu mẫu)
        if (isSimpleGreeting) {
            return "Dạ chào bạn! Cửa hàng giày ShoeStore rất vui được hỗ trợ bạn. Bạn cần tìm mẫu giày của thương hiệu nào (Nike, Adidas, Jordan...) hay cần tư vấn về sản phẩm gì ạ?";
        }

        // 5. Nếu là câu hỏi chung (chính sách, địa chỉ, tư vấn...), gọi AI LLM để trả lời văn bản
        String productsContext = getProductsContext();
        List<Map<String, String>> messages = new ArrayList<>();

        String systemInstructions = "Bạn là trợ lý ảo thân thiện của cửa hàng giày ShoeStore.\n"
                + "Trả lời hoàn toàn bằng Tiếng Việt tự nhiên, lịch sự, ngắn gọn (2-3 câu).\n"
                + "TUYỆT ĐỐI KHÔNG hỏi người dùng mã ID hay bảo người dùng nhập ID sản phẩm.\n"
                + "Dưới đây là danh sách sản phẩm cửa hàng đang có:\n"
                + productsContext + "\n"
                + "Khi nhắc tới bất kỳ sản phẩm nào trong danh sách trên, hãy tự động kèm theo định dạng Card: [PRODUCT:id|name|price|image].";

        messages.add(Map.of("role", "system", "content", systemInstructions));
        messages.add(Map.of("role", "user", "content", userMessage));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");

        List<String> models = Arrays.asList(
            "meta-llama/llama-3.3-70b-instruct:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "deepseek/deepseek-r1:free",
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
                            String aiReply = (String) msgObj.get("content");
                            // Nếu AI reply chưa có card mà ta có matchedProducts, tự động đính kèm card bên dưới
                            if (!aiReply.contains("[PRODUCT:") && !matchedProducts.isEmpty()) {
                                aiReply += "\n\nMột số mẫu bạn có thể tham khảo:" + buildProductCardsString(matchedProducts);
                            }
                            return aiReply;
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi gọi AI model " + model + ": " + e.getMessage());
            }
        }

        // Fallback nếu AI LLM offline: Trả về kết quả tìm kiếm sản phẩm thực tế từ DB
        if (!matchedProducts.isEmpty()) {
            return "Dạ shop xin gợi ý cho bạn các mẫu sản phẩm hot đang có tại ShoeStore ạ:" + buildProductCardsString(matchedProducts);
        }

        return "Dạ hiện tại cửa hàng ShoeStore có rất nhiều mẫu Sneaker mới về! Bạn có thể xem toàn bộ danh mục sản phẩm tại trang Cửa hàng hoặc liên hệ hotline shop để được hỗ trợ nhanh nhất nhé! 😊";
    }

    private String getProductsContext() {
        try {
            String sql = "SELECT TOP 10 p.id, p.product_name, " +
                         "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price, " +
                         "(SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC) as image " +
                         "FROM products p WHERE p.status = 1 ORDER BY p.id DESC";

            List<Map<String, Object>> products = jdbcTemplate.queryForList(sql);

            return products.stream()
                .map(p -> {
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
                    return String.format("ID: %s, Tên: %s, Giá: %d, Card: [PRODUCT:%s|%s|%d|%s]", 
                        p.get("id"), p.get("product_name"), priceVal, p.get("id"), p.get("product_name"), priceVal, img);
                })
                .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "Danh sách sản phẩm ShoeStore.";
        }
    }
}
