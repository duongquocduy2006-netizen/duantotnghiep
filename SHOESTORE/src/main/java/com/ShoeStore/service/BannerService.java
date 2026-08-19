package com.ShoeStore.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ShoeStore.model.Banner;
import com.ShoeStore.repository.BannerRepository;

import java.util.List;
import java.util.Optional;

@Service
public class BannerService {

    @Autowired
    private BannerRepository bannerRepository;

      public List<Banner> findAll() {
        return bannerRepository.findAll();
    }

    public List<Banner> findActiveBanners() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<Banner> activeBanners = bannerRepository.findActiveBanners(now);

        // Kiểm tra xem hiện tại có Banner Giới hạn (Limited) nào đang chạy không
        java.util.Optional<Banner> activeLimited = activeBanners.stream()
                .filter(b -> !"Default".equalsIgnoreCase(b.getSeasonType()) && b.getStartDate() != null && b.getEndDate() != null)
                .filter(b -> !now.isBefore(b.getStartDate()) && !now.isAfter(b.getEndDate()))
                .findFirst();

        if (activeLimited.isPresent()) {
            // Có chiến dịch Giới hạn đang diễn ra -> Ưu tiên hiển thị đè lên Banner Mặc định
            return java.util.List.of(activeLimited.get());
        }

        // Không có chiến dịch Giới hạn -> Hiển thị Banner Mặc định hệ thống
        return activeBanners.stream()
                .filter(b -> "Default".equalsIgnoreCase(b.getSeasonType()) || (b.getStartDate() == null && b.getEndDate() == null))
                .collect(java.util.stream.Collectors.toList());
    }

    public Optional<Banner> findById(Long id) {
        return bannerRepository.findById(id);
    }

    public Banner save(Banner banner) {
        return bannerRepository.save(banner);
    }

    public void deleteById(Long id) {
        bannerRepository.deleteById(id);
    }

    @Autowired
    private com.ShoeStore.repository.BannerImageRepository bannerImageRepository;

    public void deleteImageById(Long imgId) {
        bannerImageRepository.deleteById(imgId);
    }


}
