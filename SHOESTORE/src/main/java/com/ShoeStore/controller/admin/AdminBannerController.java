package com.ShoeStore.controller.admin;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.ShoeStore.model.Banner;
import com.ShoeStore.model.BannerImage;
import com.ShoeStore.service.BannerService;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Controller
@RequestMapping("/admin/banners")
public class AdminBannerController {

    @Autowired
    private BannerService bannerService;

    @GetMapping
    public String index(Model model) {
        List<Banner> banners = bannerService.findAll();
        // Sort descending by id
        banners.sort((b1, b2) -> b2.getId().compareTo(b1.getId()));
        model.addAttribute("banners", banners);
        return "admin/banners";
    }

    @GetMapping("/add")
    public String showAddForm(Model model) {
        model.addAttribute("banner", new Banner());
        return "admin/banner-form";
    }

    @GetMapping("/edit/{id}")
    public String showEditForm(@PathVariable Long id, Model model, RedirectAttributes redirectAttributes) {
        Banner banner = bannerService.findById(id).orElse(null);
        if (banner == null) {
            redirectAttributes.addFlashAttribute("error", "Không tìm thấy banner!");
            return "redirect:/admin/banners";
        }
        model.addAttribute("banner", banner);
        return "admin/banner-form";
    }

    @PostMapping("/save")
    public String saveBanner(@ModelAttribute Banner formBanner, 
                             @RequestParam(value = "imageFiles", required = false) List<MultipartFile> imageFiles,
                             RedirectAttributes redirectAttributes) {
        
        Banner banner = (formBanner.getId() != null) ? bannerService.findById(formBanner.getId()).orElse(new Banner()) : new Banner();
        
        banner.setName(formBanner.getName());
        banner.setDescription(formBanner.getDescription());
        banner.setSeasonType(formBanner.getSeasonType());
        banner.setStartDate(formBanner.getStartDate());
        banner.setEndDate(formBanner.getEndDate());
        banner.setStatus(formBanner.getStatus());

        if (banner.getImages() == null) {
            banner.setImages(new HashSet<>());
        }
        
        // Handle image uploads
        if (imageFiles != null && !imageFiles.isEmpty()) {
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            for (MultipartFile file : imageFiles) {
                if (!file.isEmpty()) {
                    try {
                        String originalFilename = file.getOriginalFilename();
                        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                        String fileName = "BNN-" + UUID.randomUUID().toString() + extension;
                        Path filePath = Paths.get(uploadDir + fileName);
                        Files.write(filePath, file.getBytes());

                        BannerImage bannerImage = new BannerImage();
                        bannerImage.setImageUrl(fileName);
                        bannerImage.setBanner(banner);
                        // Just append
                        banner.getImages().add(bannerImage);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }

        bannerService.save(banner);
        redirectAttributes.addFlashAttribute("message", "Lưu chiến dịch Banner thành công!");
        return "redirect:/admin/banners";
    }

    @GetMapping("/image/delete/{imgId}/{bannerId}")
    public String deleteBannerImage(@PathVariable Long imgId, @PathVariable Long bannerId, RedirectAttributes redirectAttributes) {
        bannerService.deleteImageById(imgId);
        redirectAttributes.addFlashAttribute("message", "Đã xóa 1 ảnh khỏi chiến dịch!");
        return "redirect:/admin/banners/edit/" + bannerId;
    }

    @GetMapping("/delete/{id}")
    public String deleteBanner(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        bannerService.deleteById(id);
        redirectAttributes.addFlashAttribute("message", "Xóa banner thành công!");
        return "redirect:/admin/banners";
    }
}
