package com.ShoeStore.controller.admin;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.ShoeStore.model.Color;
import com.ShoeStore.model.Size;
import com.ShoeStore.repository.ColorRepository;
import com.ShoeStore.repository.SizeRepository;
import java.util.Map;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;

@Controller
@RequestMapping("/admin/attributes")
public class AdminAttributeManager {

    @Autowired
    private ColorRepository colorRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @GetMapping
    public String list(Model model) {
        model.addAttribute("colors", colorRepository.findAll());
        model.addAttribute("sizes", sizeRepository.findAll());
        return "admin/attributes";
    }

    @PostMapping("/color/save")
    public String saveColor(@RequestParam("name") String colorName) {
        Color color = new Color();
        color.setColorName(colorName);
        colorRepository.save(color);
        return "redirect:/admin/attributes";
    }

    @GetMapping("/color/delete/{id}")
    public String deleteColor(@PathVariable Integer id, 
                            @RequestParam(value = "productId", required = false) Integer productId,
                            RedirectAttributes redirectAttributes) {
        try {
            colorRepository.deleteById(id);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Không thể xóa màu này vì đang có sản phẩm sử dụng!");
        }
        if (productId != null) {
            return "redirect:/admin/products/detail/" + productId;
        }
        return "redirect:/admin/attributes";
    }

    @DeleteMapping("/color/api/delete/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteColorApi(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            colorRepository.deleteById(id);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Không thể xóa vì đang được sử dụng!");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/color/api/update")
    @ResponseBody
    public ResponseEntity<?> updateColor(@RequestParam Integer id, @RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        try {
            Color color = colorRepository.findById(id).orElseThrow();
            color.setColorName(name);
            colorRepository.save(color);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/size/save")
    public String saveSize(@RequestParam("name") String sizeName) {
        Size size = new Size();
        size.setSizeName(sizeName);
        sizeRepository.save(size);
        return "redirect:/admin/attributes";
    }

    @GetMapping("/size/delete/{id}")
    public String deleteSize(@PathVariable Integer id, 
                           @RequestParam(value = "productId", required = false) Integer productId,
                           RedirectAttributes redirectAttributes) {
        try {
            sizeRepository.deleteById(id);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Không thể xóa kích cỡ này vì đang có sản phẩm sử dụng!");
        }
        if (productId != null) {
            return "redirect:/admin/products/detail/" + productId;
        }
        return "redirect:/admin/attributes";
    }

    @DeleteMapping("/size/api/delete/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteSizeApi(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            sizeRepository.deleteById(id);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Không thể xóa vì đang được sử dụng!");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/size/api/update")
    @ResponseBody
    public ResponseEntity<?> updateSize(@RequestParam Integer id, @RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        try {
            Size size = sizeRepository.findById(id).orElseThrow();
            size.setSizeName(name);
            sizeRepository.save(size);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            return ResponseEntity.badRequest().body(response);
        }
    }
}
