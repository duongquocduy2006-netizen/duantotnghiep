package com.ShoeStore.controller.api;

import com.ShoeStore.service.GHNService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ghn")
public class GHNProxyController {

	@Autowired
	private GHNService ghnService;

	@GetMapping("/provinces")
	public Object getProvinces() {
		return ghnService.getProvinces();
	}

	@GetMapping("/districts")
	public Object getDistricts(@RequestParam Integer provinceId) {
		return ghnService.getDistricts(provinceId);
	}

	@GetMapping("/wards")
	public Object getWards(@RequestParam Integer districtId) {
		return ghnService.getWards(districtId);
	}

	@PostMapping("/calculate-fee")
	public Object calculateFee(@RequestBody Map<String, Object> request) {
		Integer toDistrictId = (Integer) request.get("toDistrictId");
		String toWardCode = (String) request.get("toWardCode");
		Integer totalAmount = (Integer) request.get("totalAmount");
		return ghnService.calculateFee(toDistrictId, toWardCode, totalAmount);
	}
}
