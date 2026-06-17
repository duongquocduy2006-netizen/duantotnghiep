package com.ShoeStore.controller.api;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ShoeStore.model.Brand;
import com.ShoeStore.repository.BrandRepository;
import com.ShoeStore.repository.ProductRepository;

@RestController
@RequestMapping("/api/brands")
public class BrandApiController {

	@Autowired
	private BrandRepository brandRepo;

	@Autowired
	private ProductRepository productRepo;

	// 1. Lấy toàn bộ thương hiệu (GET)
	@GetMapping
	public List<Brand> getAllBrands() {
		return brandRepo.findAll();
	}

	// 2. Lấy một thương hiệu theo ID (GET)
	@GetMapping("/{id}")
	public ResponseEntity<Brand> getBrandById(@PathVariable Integer id) {
		return brandRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
	}

	private String saveImage(String imageBase64) throws Exception {
		if (imageBase64 == null || imageBase64.isEmpty()) return null;
		String base64Data = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;
		byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
		String fileName = UUID.randomUUID().toString() + ".jpg";
		String uploadDir = System.getProperty("user.dir") + "/uploads/";
		File dir = new File(uploadDir);
		if (!dir.exists()) dir.mkdirs();
		String filePath = uploadDir + fileName;
		try (FileOutputStream fos = new FileOutputStream(filePath)) {
			fos.write(decodedBytes);
		}
		return fileName;
	}

	// 3. Thêm mới thương hiệu (POST)
	@PostMapping
	public ResponseEntity<?> createBrand(@RequestBody Map<String, Object> payload) {
		try {
			String name = (String) payload.get("name");
			Boolean active = (Boolean) payload.get("active");
			String imageBase64 = (String) payload.get("imageBase64");

			Brand brand = new Brand();
			brand.setName(name);
			brand.setActive(active != null ? active : true);

			if (imageBase64 != null && !imageBase64.isEmpty()) {
				brand.setImageUrl(saveImage(imageBase64));
			}

			Brand saved = brandRepo.save(brand);
			return ResponseEntity.ok(saved);
		} catch (org.springframework.dao.DataIntegrityViolationException e) {
			return ResponseEntity.badRequest()
					.body(Map.of("error", "Tên thương hiệu này đã tồn tại! Vui lòng nhập tên khác."));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "Lỗi lưu thương hiệu: " + e.getMessage()));
		}
	}

	// 4. Cập nhật thương hiệu (PUT)
	@PutMapping("/{id}")
	public ResponseEntity<?> updateBrand(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
		return brandRepo.findById(id).map(brand -> {
			try {
				String name = (String) payload.get("name");
				Boolean active = (Boolean) payload.get("active");
				String imageBase64 = (String) payload.get("imageBase64");

				if (name != null) brand.setName(name);
				if (active != null) brand.setActive(active);

				if (imageBase64 != null && !imageBase64.isEmpty()) {
					brand.setImageUrl(saveImage(imageBase64));
				}

				Brand updated = brandRepo.save(brand);
				return ResponseEntity.ok(updated);
			} catch (org.springframework.dao.DataIntegrityViolationException e) {
				return ResponseEntity.badRequest().body(Map.of("error", "Tên thương hiệu này đã tồn tại!"));
			} catch (Exception e) {
				return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
						.body(Map.of("error", "Lỗi cập nhật thương hiệu: " + e.getMessage()));
			}
		}).orElse(ResponseEntity.notFound().build());
	}

	// 5. Xóa thương hiệu (DELETE)
	@DeleteMapping("/{id}")
	public ResponseEntity<?> deleteBrand(@PathVariable Integer id) {
		return brandRepo.findById(id).map(brand -> {
			// Kiểm tra xem có sản phẩm nào đang dùng Brand này không
			if (productRepo.existsByBrandName(brand.getName())) {
				return ResponseEntity.badRequest().body(Map.of("error", "Không thể xóa thương hiệu này vì vẫn còn sản phẩm đang mang tên của hãng!"));
			}
			brandRepo.delete(brand);
			return ResponseEntity.ok(Map.of("message", "Xóa thành công!"));
		}).orElse(ResponseEntity.notFound().build());
	}
}
