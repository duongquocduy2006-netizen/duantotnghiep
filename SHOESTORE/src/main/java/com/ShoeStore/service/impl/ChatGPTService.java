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
        // Clean punctuation and double spaces, wrap with spaces
        String cleanSource = " " + source.replaceAll("[\\p{Punct}]", " ").replaceAll("\\s+", " ") + " ";
        String target = " " + keyword.trim() + " ";
        return cleanSource.toLowerCase().contains(target.toLowerCase());
    }

    private String checkStaticResponse(String userMessage) {
        if (userMessage == null) return null;
        String msg = userMessage.trim().toLowerCase();

        // 1. Chào hỏi (Greetings)
        List<String> greetings = Arrays.asList(
            "hello", "hi", "chào", "chao", "alo", "hey", "chào shop", "chao shop", 
            "shop ơi", "shop oi", "ad ơi", "ad oi", "hello shop", "hi shop"
        );
        for (String greet : greetings) {
            if (msg.equals(greet) || msg.startsWith(greet + " ") || msg.endsWith(" " + greet)) {
                return "Dạ chào bạn! Cửa hàng giày ShoeStore rất vui được hỗ trợ bạn. Bạn cần tìm mẫu giày gì hoặc có thắc mắc nào cần shop giải đáp không ạ?";
            }
        }

        // 2. Kiểm tra nếu tin nhắn quá ngắn
        if (msg.length() < 3) {
            return "Dạ bạn cần shop hỗ trợ thông tin gì không ạ? Hãy nhập câu hỏi cụ thể để shop tư vấn nhé!";
        }

        // Danh sách từ khóa CHẮC CHẮN KHÔNG liên quan (thực phẩm, đồ ăn, chủ đề ngoài lề...)
        List<String> unrelatedKeywords = Arrays.asList(
            "bánh mì", "banh mi", "cơm", "com", "phở", "pho", "bún", "bun", "chè", "che",
            "trà sữa", "tra sua", "coffee", "cà phê", "ca phe", "bia", "rượu", "ruou",
            "gà", "ga", "vịt", "vit", "heo", "bò", "bo", "cá", "ca", "tôm", "tom",
            "pizza", "burger", "hamburger", "sushi", "mì", "mi", "nước", "nuoc",
            "xe máy", "xe may", "ô tô", "o to", "xe hơi", "xe hoi", "laptop", "điện thoại ip",
            "bitcoin", "tiền ảo", "tien ao", "chứng khoán", "chung khoan",
            "chính trị", "chinh tri", "bầu cử", "bau cu", "tôn giáo", "ton giao",
            "game", "phim", "movie", "nhạc", "nhac", "tiktok", "facebook"
        );

        boolean isUnrelated = unrelatedKeywords.stream().anyMatch(keyword -> containsWholeWord(msg, keyword));

        // Danh sách từ khóa liên quan TRỰC TIẾP đến sản phẩm giày dép
        List<String> shoeKeywords = Arrays.asList(
            "giày", "giay", "sneaker", "boot", "sục", "suc", "dep", "dép", "sandal", 
            "quai chéo", "quai cheo", "thể thao", "the thao", "sản phẩm", "san pham",
            "mẫu", "mau", "nike", "adidas", "jordan", "puma", "converse", "vans",
            "giỏ hàng", "gio hang", "đơn hàng", "don hang"
        );

        boolean hasShoeKeyword = shoeKeywords.stream().anyMatch(keyword -> containsWholeWord(msg, keyword));

        // Nếu có từ không liên quan VÀ KHÔNG có từ liên quan đến giày → chặn ngay
        if (isUnrelated && !hasShoeKeyword) {
            return "Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các câu hỏi liên quan đến sản phẩm giày, chính sách mua bán, giao hàng, đổi trả và thông tin liên hệ của shop thôi ạ. Bạn vui lòng đặt câu hỏi liên quan để em hỗ trợ nhé!";
        }

        // Danh sách từ khóa liên quan đến cửa hàng giày, sản phẩm, dịch vụ
        List<String> relatedKeywords = Arrays.asList(
            "giày", "giay", "sneaker", "boot", "sục", "dep", "dép", "sandal", "quai chéo", "thể thao", 
            "size", "kích cỡ", "kich co", "cỡ", "co", "số", "so", "bảng size", "bang size", 
            "giá", "gia", "bao nhiêu", "bao nhieu", "nhiêu", "nhieu", "tiền", "tien", "đ", "k", "vnđ", "vnd", "đồng", "dong",
            "mua", "bán", "ban", "đặt", "dat", "order", "hàng", "hang", "sản phẩm", "san pham", "mẫu", "mau", "màu", "color",
            "ship", "giao", "vận chuyển", "van chuyen", "phí", "phi", "nhận", "nhan", "cod", "thanh toán", "thanh toan", "chuyển khoản", "chuyen khoan", "ck",
            "địa chỉ", "dia chi", "địa điểm", "dia diem", "ở đâu", "o dau", "cửa hàng", "cua hang", "shop", "store",
            "voucher", "giảm giá", "giam gia", "khuyến mãi", "khuyen mai", "ưu đãi", "uu dai", "code", "mã", "ma",
            "chính sách", "chinh sach", "đổi trả", "doi tra", "bảo hành", "bao hanh",
            "sđt", "điện thoại", "dien thoai", "hotline", "liên hệ", "lien he", "tư vấn", "tu van", "hỗ trợ", "ho tro",
            "giỏ hàng", "gio hang", "đơn hàng", "don hang", "hủy", "huy", "trạng thái", "trang thai",
            "còn", "con", "hết", "het", "chất liệu", "chat lieu", "da", "vải", "vai", "đế", "de", "cao su",
            "nike", "adidas", "jordan", "puma", "converse", "vans"
        );

        // Sử dụng Lambda Stream để kiểm tra xem tin nhắn có chứa bất kỳ từ khóa liên quan nào hay không (so khớp nguyên từ)
        boolean isRelated = relatedKeywords.stream().anyMatch(keyword -> containsWholeWord(msg, keyword))
                || msg.matches(".*\\d+\\s*(k|đ|vnd|vnđ|đồng|size|cỡ).*");

        if (!isRelated) {
            return "Dạ hiện tại cửa hàng ShoeStore chỉ hỗ trợ tư vấn các câu hỏi liên quan đến sản phẩm giày, chính sách mua bán, giao hàng, đổi trả và thông tin liên hệ của shop thôi ạ. Bạn vui lòng đặt câu hỏi liên quan để em hỗ trợ nhé!";
        }

        return null; // Tiếp tục gửi lên AI
    }

    public String getAIResponse(String userMessage) {
        String staticReply = checkStaticResponse(userMessage);
        if (staticReply != null) {
            return staticReply;
        }

        String productsContext = getProductsContext();
        
        List<Map<String, String>> messages = new ArrayList<>();
        
        String systemInstructions = "Bạn là trợ lý ảo của cửa hàng giày ShoeStore. "
                + "Bạn chỉ được phép trả lời các câu hỏi liên quan đến sản phẩm, chính sách, địa chỉ hoặc dịch vụ của ShoeStore. "
                + "Nếu khách hàng hỏi về các chủ đề khác không liên quan đến shop, hãy từ chối lịch sự. "
                + "Tuyệt đối không trả lời các câu hỏi về chính trị, tôn giáo, hoặc các vấn đề xã hội khác ngoài ShoeStore.\n"
                + "Dưới đây là danh sách sản phẩm THẬT của shop:\n"
                + productsContext + "\n"
                 + "QUY TẮC HIỂN THỊ SẢN PHẨM:\n"
                + "1. Chỉ gắn link sản phẩm khi khách hàng yêu cầu gợi ý, hỏi về mẫu mã cụ thể hoặc đang có ý định tìm mua sản phẩm đó.\n"
                + "2. Khi gắn link sản phẩm, bạn PHẢI sử dụng định dạng Card sau ngay sau lời giới thiệu: [PRODUCT:id|name|price|image] (trong đó price là số nguyên thuần túy không chứa dấu chấm, dấu phẩy hay ký hiệu tiền tệ, ví dụ: 1200000, lấy từ phần nguyên của Giá trong danh sách sản phẩm).\n"
                + "3. Bạn PHẢI trả lời hoàn toàn bằng tiếng Việt chuẩn. TUYỆT ĐỐI không sử dụng từ ngữ tiếng Pháp, tiếng Anh, không pha trộn ngôn ngữ, không tự dịch hoặc dùng từ kỳ lạ. 100% câu trả lời phải là tiếng Việt tự nhiên, thân thiện, ngắn gọn và lịch sự.";

        messages.add(Map.of("role", "system", "content", systemInstructions));
        messages.add(Map.of("role", "user", "content", userMessage));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");

        List<String> models = Arrays.asList(
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "openrouter/free"
        );

        for (String model : models) {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            try {
                System.out.println("Attempting AI response with model: " + model);
                ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_URL, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK) {
                    Map body = response.getBody();
                    List choices = (List) body.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map firstChoice = (Map) choices.get(0);
                        Map msg = (Map) firstChoice.get("message");
                        if (msg != null && msg.containsKey("content")) {
                            System.out.println("Successfully got AI response using model: " + model);
                            return (String) msg.get("content");
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to get response with model " + model + ": " + e.getMessage());
            }
        }

        return "Dạ hiện tại hệ thống tư vấn tự động đang bận. Anh/chị vui lòng liên hệ hotline hoặc gửi tin nhắn qua Fanpage để nhân viên hỗ trợ trực tiếp ạ! 😊";
    }

    private String getProductsContext() {
        try {
            String sql = "SELECT TOP 10 p.id, p.product_name, " +
                         "(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price, " +
                         "(SELECT TOP 1 image_url FROM product_images WHERE product_id = p.id) as image " +
                         "FROM products p WHERE p.status = 1";
            
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
                    return String.format("ID: %s, Tên: %s, Giá: %d, Ảnh: %s", 
                        p.get("id"), p.get("product_name"), priceVal, p.get("image"));
                })
                .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "Shop có nhiều mẫu Sneaker mới về.";
        }
    }
}
