package com.ShoeStore.controller.api;

import com.ShoeStore.model.Banner;
import com.ShoeStore.model.BannerImage;
import com.ShoeStore.service.BannerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/banners")
public class BannerApiController {

    @Autowired
    private BannerService bannerService;

    @GetMapping
    public ResponseEntity<List<Banner>> getAllBanners() {
        List<Banner> banners = bannerService.findAll();
        banners.sort((b1, b2) -> {
            boolean isDef1 = "Default".equalsIgnoreCase(b1.getSeasonType()) || (b1.getStartDate() == null && b1.getEndDate() == null);
            boolean isDef2 = "Default".equalsIgnoreCase(b2.getSeasonType()) || (b2.getStartDate() == null && b2.getEndDate() == null);
            if (isDef1 && !isDef2) return -1; // Banner Mặc định luôn lên đầu!
            if (!isDef1 && isDef2) return 1;
            return b2.getId().compareTo(b1.getId());
        });
        return ResponseEntity.ok(banners);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Banner> getBannerById(@PathVariable Long id) {
        return bannerService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> saveBanner(
            @RequestParam(value = "id", required = false) Long id,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "seasonType", required = false) String seasonType,
            @RequestParam(value = "startDate", required = false) String startDateStr,
            @RequestParam(value = "endDate", required = false) String endDateStr,
            @RequestParam("status") Boolean status,
            @RequestParam(value = "imageFiles", required = false) List<MultipartFile> imageFiles) {

        try {
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Vui lòng nhập tên chiến dịch Banner!"));
            }

            boolean isDefaultType = "Default".equalsIgnoreCase(seasonType) || "Mặc định".equalsIgnoreCase(seasonType);

            LocalDateTime sDate = null;
            LocalDateTime eDate = null;

            if (!isDefaultType) {
                if (startDateStr != null && !startDateStr.isEmpty()) {
                    String isoDate = startDateStr;
                    if (isoDate.length() == 16) isoDate += ":00";
                    sDate = LocalDateTime.parse(isoDate);
                }
                if (endDateStr != null && !endDateStr.isEmpty()) {
                    String isoDate = endDateStr;
                    if (isoDate.length() == 16) isoDate += ":00";
                    eDate = LocalDateTime.parse(isoDate);
                }

                if (sDate == null) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Chiến dịch loại Giới hạn bắt buộc phải chọn thời gian bắt đầu!"));
                }

                if (eDate == null) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Chiến dịch loại Giới hạn bắt buộc phải chọn thời gian kết thúc!"));
                }

                // 1. Kiểm tra ngày kết thúc phải sau ngày bắt đầu
                if (!eDate.isAfter(sDate)) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Thời gian kết thúc phải sau thời gian bắt đầu!"));
                }
            }

            // 2. Kiểm tra bắt buộc phải có ít nhất 1 hình ảnh banner
            Banner banner = (id != null) ? bannerService.findById(id).orElse(new Banner()) : new Banner();
            int existingImgCount = (banner.getImages() != null) ? banner.getImages().size() : 0;
            int newImgCount = (imageFiles != null) ? (int) imageFiles.stream().filter(f -> !f.isEmpty()).count() : 0;
            if (existingImgCount + newImgCount == 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Bắt buộc phải tải lên ít nhất 1 hình ảnh cho Banner!"));
            }

            // 3. Nếu chiến dịch ở trạng thái Kích hoạt (status == true) và là loại Giới hạn (Limited),
            // Kiểm tra không được có 2 chiến dịch Giới hạn cùng hoạt động trùng khoảng thời gian!
            if (Boolean.TRUE.equals(status) && !isDefaultType) {
                LocalDateTime newStart = sDate;
                LocalDateTime newEnd = eDate;

                List<Banner> allBanners = bannerService.findAll();
                for (Banner existing : allBanners) {
                    if (id != null && id.equals(existing.getId())) {
                        continue; // Bỏ qua chính nó khi đang Edit
                    }

                    // Bỏ qua các banner Mặc định (Default), chỉ kiểm tra các banner Giới hạn (Limited)
                    boolean isExistingDefault = "Default".equalsIgnoreCase(existing.getSeasonType()) || (existing.getStartDate() == null && existing.getEndDate() == null);
                    if (!isExistingDefault && existing.getStatus() != null && existing.getStatus()) {
                        LocalDateTime exStart = existing.getStartDate();
                        LocalDateTime exEnd = existing.getEndDate();

                        if (exStart != null && exEnd != null) {
                            boolean isOverlapping = newStart.isBefore(exEnd) && newEnd.isAfter(exStart);
                            if (isOverlapping) {
                                return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", "Trong cùng một thời điểm không được có hai chiến dịch Banner Giới hạn cùng hoạt động! Chiến dịch '" 
                                                + existing.getName() + "' (ID #" + existing.getId() + ") đang diễn ra trong khoảng thời gian này."
                                ));
                            }
                        }
                    }
                }
            }

            banner.setName(name.trim());
            banner.setDescription(description);
            banner.setSeasonType(seasonType);
            banner.setStartDate(sDate);
            banner.setEndDate(eDate);
            banner.setStatus(status);

            if (banner.getImages() == null) {
                banner.setImages(new HashSet<>());
            }

            // Handle image uploads
            if (imageFiles != null && !imageFiles.isEmpty()) {
                String uploadDir = System.getProperty("user.dir") + "/uploads/";
                File dir = new File(uploadDir);
                if (!dir.exists())
                    dir.mkdirs();

                for (MultipartFile file : imageFiles) {
                    if (!file.isEmpty()) {
                        String originalFilename = file.getOriginalFilename();
                        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                        String fileName = "BNN-" + UUID.randomUUID().toString() + extension;
                        Path filePath = Paths.get(uploadDir + fileName);
                        Files.write(filePath, file.getBytes());

                        BannerImage bannerImage = new BannerImage();
                        bannerImage.setImageUrl(fileName);
                        bannerImage.setBanner(banner);
                        banner.getImages().add(bannerImage);
                    }
                }
            }

            Banner savedBanner = bannerService.save(banner);
            return ResponseEntity.ok(savedBanner);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Lỗi lưu banner: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBanner(@PathVariable Long id) {
        try {
            Optional<Banner> optionalBanner = bannerService.findById(id);
            if (optionalBanner.isPresent()) {
                Banner b = optionalBanner.get();
                if ("Default".equalsIgnoreCase(b.getSeasonType()) || (b.getStartDate() == null && b.getEndDate() == null)) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Banner mặc định của hệ thống không thể xóa!"));
                }
            }
            bannerService.deleteById(id);
            return ResponseEntity.ok(Collections.singletonMap("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/image/{imgId}")
    public ResponseEntity<?> deleteBannerImage(@PathVariable Long imgId) {
        try {
            bannerService.deleteImageById(imgId);
            return ResponseEntity.ok(Collections.singletonMap("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
