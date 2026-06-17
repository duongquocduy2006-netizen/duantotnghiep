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
        return bannerRepository.findByStatusTrue();
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
