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
		List<Brand> all = brandRepo.findAll();
		// Tự động dọn dẹp các dòng thương hiệu bị trùng tên dư thừa trước đó trong DB
		Map<String, Brand> uniqueMap = new java.util.LinkedHashMap<>();
		List<Brand> duplicatesToDelete = new java.util.ArrayList<>();

		for (Brand b : all) {
			if (b.getName() == null || b.getName().trim().isEmpty()) continue;
			String key = b.getName().trim().toLowerCase();
			if (uniqueMap.containsKey(key)) {
				duplicatesToDelete.add(b);
			} else {
				uniqueMap.put(key, b);
			}
		}

		if (!duplicatesToDelete.isEmpty()) {
			try {
				brandRepo.deleteAll(duplicatesToDelete);
				return brandRepo.findAll();
			} catch (Exception ignored) {}
		}

		return all;
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

			if (name == null || name.trim().isEmpty()) {
				return ResponseEntity.badRequest().body(Map.of("error", "Tên thương hiệu không được để trống!"));
			}

			String cleanName = name.trim();
			boolean exists = brandRepo.findAll().stream()
					.anyMatch(b -> b.getName() != null && b.getName().trim().equalsIgnoreCase(cleanName));
			if (exists) {
				return ResponseEntity.badRequest().body(Map.of("error", "Tên thương hiệu '" + cleanName + "' đã tồn tại! Vui lòng nhập tên khác."));
			}

			Brand brand = new Brand();
			brand.setName(cleanName);
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

				if (name != null) {
					String cleanName = name.trim();
					if (cleanName.isEmpty()) {
						return ResponseEntity.badRequest().body(Map.of("error", "Tên thương hiệu không được để trống!"));
					}
					boolean exists = brandRepo.findAll().stream()
							.anyMatch(b -> b.getName() != null && !b.getId().equals(id) && b.getName().trim().equalsIgnoreCase(cleanName));
					if (exists) {
						return ResponseEntity.badRequest().body(Map.of("error", "Tên thương hiệu '" + cleanName + "' đã tồn tại!"));
					}
					brand.setName(cleanName);
				}

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
			String bName = brand.getName() != null ? brand.getName().trim() : "";
			// Nếu có một thương hiệu khác cùng tên (ví dụ #BRD-02 đã đại diện cho ADIDAS), cho phép xóa dòng trùng dư thừa #BRD-11
			boolean duplicateBrandExists = brandRepo.findAll().stream()
					.anyMatch(other -> !other.getId().equals(id) && other.getName() != null && other.getName().trim().equalsIgnoreCase(bName));

			if (!duplicateBrandExists && productRepo.existsByBrandName(brand.getName())) {
				return ResponseEntity.badRequest().body(Map.of("error", "Không thể xóa thương hiệu này vì vẫn còn sản phẩm đang mang tên của hãng!"));
			}

			brandRepo.delete(brand);
			return ResponseEntity.ok(Map.of("message", "Xóa thành công!"));
		}).orElse(ResponseEntity.notFound().build());
	}
}
