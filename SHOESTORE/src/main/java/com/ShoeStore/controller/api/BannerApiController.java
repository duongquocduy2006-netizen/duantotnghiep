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
<<<<<<< Updated upstream
@CrossOrigin(originPatterns = "*")
=======
>>>>>>> Stashed changes
public class BannerApiController {

    @Autowired
    private BannerService bannerService;

    @GetMapping
    public ResponseEntity<List<Banner>> getAllBanners() {
        List<Banner> banners = bannerService.findAll();
        banners.sort((b1, b2) -> b2.getId().compareTo(b1.getId()));
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
            Banner banner = (id != null) ? bannerService.findById(id).orElse(new Banner()) : new Banner();

            banner.setName(name);
            banner.setDescription(description);
            banner.setSeasonType(seasonType);

            if (startDateStr != null && !startDateStr.isEmpty()) {
                String isoDate = startDateStr;
                if (isoDate.length() == 16)
                    isoDate += ":00"; // Convert YYYY-MM-DDTHH:MM to YYYY-MM-DDTHH:MM:SS
                banner.setStartDate(LocalDateTime.parse(isoDate));
            }
            if (endDateStr != null && !endDateStr.isEmpty()) {
                String isoDate = endDateStr;
                if (isoDate.length() == 16)
                    isoDate += ":00";
                banner.setEndDate(LocalDateTime.parse(isoDate));
            }

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
            return ResponseEntity.badRequest().body("Error saving banner: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBanner(@PathVariable Long id) {
        try {
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
