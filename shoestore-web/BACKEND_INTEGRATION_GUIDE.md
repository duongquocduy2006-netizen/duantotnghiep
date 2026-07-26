# Backend Integration Guide - Image Search & Product Filtering

## 📌 Problem Statement
Frontend hiển thị 7 sản phẩm thay vì chỉ hiển thị sản phẩm phù hợp vì Backend trả về tất cả sản phẩm mà không lọc đúng. Cần sửa Backend để:
1. Query database với WHERE clause thay vì trả về toàn bộ sản phẩm
2. Lọc theo stock status (quantity > 0 hoặc inStock = true)
3. Lọc theo brand, category, search keyword
4. Xóa mock data từ response

---

## 🔧 Endpoint 1: `/api/ai/image-search` (POST)

### Current Issue
- Backend không lọc sản phẩm theo brand được phát hiện
- Trả về tất cả 7 sản phẩm từ database

### Required Changes

#### Request Format
```
POST /api/ai/image-search
Content-Type: multipart/form-data

file: <image file>
```

#### Response Format
```json
{
  "success": true,
  "aiResult": {
    "brand": "Nike",
    "color": "Black",
    "category": "Shoes",
    "style": "Sports"
  },
  "products": [
    {
      "id": 1,
      "product_name": "Nike Air Max 90",
      "brand_name": "Nike",
      "image_url": "/api/products/images/...",
      "min_price": 2000000,
      "quantity": 5,
      "inStock": true
    }
  ]
}
```

#### Implementation Steps

**1. Process Image & Get AI Analysis**
```
- Nhận file ảnh từ request
- Gửi lên AI API để lấy: brand, color, category, style
- Ví dụ response: { brand: "Nike", color: "Black", category: "Shoes", style: "Sports" }
```

**2. Query Database with WHERE Clause**
```sql
-- Pseudocode (adjust theo database system của bạn)
SELECT * FROM products 
WHERE LOWER(brand_name) = LOWER('Nike')  -- Lọc theo brand phát hiện
  AND (quantity > 0 OR inStock = true)     -- Chỉ lấy hàng có sẵn
  AND status = 'active'                    -- (nếu có)
ORDER BY quantity DESC
LIMIT 50;
```

**3. Format Response**
```java
// Spring Boot Example
@PostMapping("/api/ai/image-search")
public ResponseEntity<?> searchByImage(@RequestParam("file") MultipartFile file) {
    try {
        // 1. Nhận diện ảnh bằng AI
        ImageAnalysisResult aiResult = aiService.analyzeImage(file);
        // aiResult.getBrand() = "Nike", aiResult.getColor() = "Black", etc.
        
        // 2. Query products theo brand + stock status
        String detectedBrand = aiResult.getBrand();
        List<Product> products = productRepository.findByBrandAndInStock(
            detectedBrand,
            true  // inStock = true
        );
        // Or: quantity > 0
        // products = productRepository.findByBrandAndQuantityGreaterThan(detectedBrand, 0);
        
        // 3. Return response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("aiResult", aiResult);  // { brand, color, category, style }
        response.put("products", products);   // Chỉ sản phẩm đúng brand + có hàng
        
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        // Error handling
        return ResponseEntity.status(500).body(
            Map.of("success", false, "message", e.getMessage())
        );
    }
}
```

**4. Database Query (Example for Different Systems)**

**MySQL/PostgreSQL:**
```sql
SELECT p.* FROM products p
WHERE LOWER(p.brand_name) = LOWER(?)
  AND p.quantity > 0
  AND p.status = 'active'
ORDER BY p.quantity DESC;
```

**MongoDB:**
```javascript
db.products.find({
  brand_name: { $regex: brand, $options: 'i' },
  quantity: { $gt: 0 },
  status: 'active'
}).sort({ quantity: -1 });
```

---

## 🔧 Endpoint 2: `/api/products/search` (GET)

### Current Issue
- Trả về tất cả products mà không apply filter từ query parameters
- Không lọc stock status

### Required Changes

#### Request Format
```
GET /api/products/search?keyword=nike&category=1&brand=Nike&sort=latest&inStock=true
```

#### Query Parameters
| Parameter | Type | Required | Example | Description |
|-----------|------|----------|---------|-------------|
| keyword | string | No | "nike shoes" | Tìm kiếm theo tên sản phẩm |
| category | integer | No | 1 | Category ID để lọc |
| brand | string | No | "Nike" | Tên brand để lọc |
| sort | string | No | "latest" | Sắp xếp: latest, price_asc, price_desc |
| inStock | boolean | No | true | Chỉ lấy hàng có sẵn (quantity > 0) |
| maxPrice | integer | No | 5000000 | Lọc theo giá tối đa (VND) |

#### Response Format
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "product_name": "Nike Air Max 90",
      "brand_name": "Nike",
      "category_name": "Shoes",
      "image_url": "/api/products/images/...",
      "min_price": 2000000,
      "quantity": 5,
      "inStock": true
    }
  ]
}
```

#### Implementation Steps

**1. Build WHERE Clause Dynamically**
```java
@GetMapping("/api/products/search")
public ResponseEntity<?> searchProducts(
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) Integer category,
    @RequestParam(required = false) String brand,
    @RequestParam(required = false) String sort,
    @RequestParam(defaultValue = "true") boolean inStock,
    @RequestParam(required = false) Integer maxPrice
) {
    try {
        // Build query
        List<Product> products = productRepository.findAll((root, query, cb) -> {
            List<javax.persistence.criteria.Predicate> predicates = new ArrayList<>();
            
            // Filter by keyword (name or description)
            if (keyword != null && !keyword.isEmpty()) {
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("productName")), "%" + keyword.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("description")), "%" + keyword.toLowerCase() + "%")
                ));
            }
            
            // Filter by category
            if (category != null) {
                predicates.add(cb.equal(root.get("categoryId"), category));
            }
            
            // Filter by brand (case-insensitive)
            if (brand != null && !brand.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("brandName")), "%" + brand.toLowerCase() + "%"));
            }
            
            // Filter by stock status
            if (inStock) {
                predicates.add(cb.greaterThan(root.get("quantity"), 0));
                // OR: cb.equal(root.get("inStock"), true)
            }
            
            // Filter by max price
            if (maxPrice != null) {
                predicates.add(cb.le(root.get("minPrice"), maxPrice));
            }
            
            // Filter by status
            predicates.add(cb.equal(root.get("status"), "active"));
            
            return cb.and(predicates.toArray(new javax.persistence.criteria.Predicate[0]));
        }, new Sort(Sort.Direction.DESC, "createdAt")); // Default sort
        
        // Apply additional sorting
        if (sort != null) {
            switch (sort) {
                case "latest":
                    products = products.stream()
                        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                        .collect(Collectors.toList());
                    break;
                case "price_asc":
                    products = products.stream()
                        .sorted(Comparator.comparing(Product::getMinPrice))
                        .collect(Collectors.toList());
                    break;
                case "price_desc":
                    products = products.stream()
                        .sorted((a, b) -> b.getMinPrice().compareTo(a.getMinPrice()))
                        .collect(Collectors.toList());
                    break;
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("products", products);
        
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        return ResponseEntity.status(500).body(
            Map.of("success", false, "message", e.getMessage())
        );
    }
}
```

**2. SQL Query Example**
```sql
SELECT p.* FROM products p
WHERE 1=1
  AND (p.product_name LIKE '%nike%' OR p.description LIKE '%nike%') -- keyword filter
  AND p.category_id = 1                                               -- category filter
  AND LOWER(p.brand_name) LIKE '%nike%'                              -- brand filter (case-insensitive)
  AND p.quantity > 0                                                  -- stock filter
  AND p.min_price <= 5000000                                         -- price filter
  AND p.status = 'active'
ORDER BY p.created_at DESC;
```

**3. Response Format**
```java
// Map entity to DTO for response
List<ProductDTO> productDTOs = products.stream()
    .map(p -> new ProductDTO(
        p.getId(),
        p.getProductName(),
        p.getBrandName(),
        p.getCategoryName(),
        p.getImageUrl(),
        p.getMinPrice(),
        p.getQuantity(),
        p.getQuantity() > 0
    ))
    .collect(Collectors.toList());

response.put("products", productDTOs);
```

---

## ⚠️ Important Notes

### 1. Stock Status Field
**Frontend expects one of:**
- `quantity` > 0 (số lượng tồn kho)
- `inStock` = true (boolean flag)

**Choose one and keep consistent:**
```json
// Option 1: Use quantity
{ "id": 1, "quantity": 5, ... }

// Option 2: Use inStock
{ "id": 1, "inStock": true, ... }

// Better: Use both for compatibility
{ "id": 1, "quantity": 5, "inStock": true, ... }
```

### 2. Brand Name Matching
**Database might have:**
- `brand_name` (snake_case)
- `brandName` (camelCase)
- `brand` (simple)

**Frontend checks for:** `p.brand_name || p.brandName`

**Keep consistent in database schema or convert in query:**
```sql
-- Make sure return column name matches
SELECT id, product_name, brand_name, ... FROM products
```

### 3. Remove Mock Data
**Search for and remove:**
- Default UI avatar URLs: `https://ui-avatars.com/api/?name=SP`
- Placeholder images from unsplash
- Fake/test products with empty data

**Verify database:**
```sql
-- Find products with no image
SELECT * FROM products WHERE image_url IS NULL OR image_url = '';

-- Find products with no quantity/stock data
SELECT * FROM products WHERE quantity IS NULL OR quantity = 0;

-- Find inactive/draft products
SELECT * FROM products WHERE status != 'active';
```

### 4. Image URL Format
**Frontend expects:**
```javascript
// Full URL (starts with http)
"image_url": "https://example.com/images/..."

// OR relative path (will be prepended with http://localhost:8080)
"image_url": "/api/products/images/product-1.jpg"
```

**DON'T return:** null, empty string, or invalid URLs

---

## 🧪 Testing Checklist

After implementing changes, verify:

- [ ] `/api/ai/image-search` returns only products with matching brand
- [ ] All returned products have `quantity > 0` or `inStock = true`
- [ ] `/api/products/search?keyword=nike` returns only Nike products
- [ ] `/api/products/search?brand=Nike&inStock=true` returns only Nike products with stock
- [ ] `/api/products/search?maxPrice=3000000` respects price filter
- [ ] `/api/products/search` (no filters) returns products from all brands with stock
- [ ] Empty results show "Không tìm thấy sản phẩm" message (not 7 products)
- [ ] No mock data URLs in responses
- [ ] All products have valid `image_url`, `quantity`, `brand_name` fields

---

## Frontend API Calls (Reference)

**Header.jsx sends:**
```javascript
POST /api/ai/image-search
file: <image>
// Expects: { success: true, aiResult: {...}, products: [...] }
```

**Shop.jsx sends:**
```javascript
GET /api/products/search?inStock=true&keyword=nike&brand=Nike&sort=latest
// Expects: { success: true, products: [...] }
```

