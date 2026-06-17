package com.ShoeStore.controller.api;

import com.ShoeStore.model.Lookbook;
import com.ShoeStore.repository.LookbookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/lookbooks")
@CrossOrigin(origins = "*")
public class LookbookApiController {

    @Autowired
    private LookbookRepository lookbookRepository;

    @GetMapping
    public ResponseEntity<List<Lookbook>> getActiveLookbooks() {
        return ResponseEntity.ok(lookbookRepository.findByStatusTrueOrderByIdDesc());
    }

    @GetMapping("/all")
    public ResponseEntity<List<Lookbook>> getAllLookbooks() {
        return ResponseEntity.ok(lookbookRepository.findAllByOrderByIdDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Lookbook> getLookbookById(@PathVariable Long id) {
        return lookbookRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> saveLookbook(
            @RequestParam(value = "id", required = false) Long id,
            @RequestParam("caption") String caption,
            @RequestParam("status") Boolean status,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
            @RequestParam(value = "imageUrl", required = false) String imageUrlParam) {

        try {
            Lookbook lookbook = (id != null) ? lookbookRepository.findById(id).orElse(new Lookbook()) : new Lookbook();
            lookbook.setCaption(caption);
            lookbook.setStatus(status);

            if (imageFile != null && !imageFile.isEmpty()) {
                String uploadDir = System.getProperty("user.dir") + "/uploads/";
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                String originalFilename = imageFile.getOriginalFilename();
                String extension = "";
                if (originalFilename != null && originalFilename.contains(".")) {
                    extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                } else {
                    extension = ".jpg";
                }
                String fileName = "LB-" + UUID.randomUUID().toString() + extension;
                Path filePath = Paths.get(uploadDir + fileName);
                Files.write(filePath, imageFile.getBytes());

                lookbook.setImageUrl("/uploads/" + fileName);
            } else if (imageUrlParam != null && !imageUrlParam.isEmpty()) {
                lookbook.setImageUrl(imageUrlParam);
            }

            Lookbook saved = lookbookRepository.save(lookbook);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Error saving lookbook: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLookbook(@PathVariable Long id) {
        try {
            lookbookRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
