package com.ShoeStore.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class GHNService {

	private static final Logger log = LoggerFactory.getLogger(GHNService.class);

	@Value("${ghn.api.token}")
	private String ghnToken;

	@Value("${ghn.api.shopid}")
	private String ghnShopId;

	private final RestTemplate restTemplate;

	private final String BASE_URL = "https://online-gateway.ghn.vn/shiip/public-api/master-data/";

	private final String FEE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";

	public GHNService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	// =================== LOAD TỈNH ===================
	public Object getProvinces() {
		return callGHNApi(BASE_URL + "province", null);
	}

	// =================== LOAD QUẬN ===================
	public Object getDistricts(Integer provinceId) {
		Map<String, Object> body = new HashMap<>();
		body.put("province_id", provinceId);

		return callGHNApi(BASE_URL + "district", body);
	}

	// =================== LOAD PHƯỜNG ===================
	public Object getWards(Integer districtId) {
		Map<String, Object> body = new HashMap<>();
		body.put("district_id", districtId);

		return callGHNApi(BASE_URL + "ward", body);
	}

	// =================== TÍNH PHÍ SHIP ===================
	public Object calculateFee(Integer toDistrictId, String toWardCode, Integer totalAmount) {

		Integer insuranceValue = Math.min(totalAmount, 5000000);

		Map<String, Object> body = new HashMap<>();

		// SERVICE
		body.put("service_type_id", 2);

		// ĐỊA CHỈ SHOP GỬI HÀNG (CẦN THƠ)
		body.put("from_district_id", 1574); // Quận Cái Răng
		body.put("from_ward_code", "550307"); // Phường Lê Bình

		// ĐỊA CHỈ KHÁCH
		body.put("to_district_id", toDistrictId);
		body.put("to_ward_code", toWardCode);

		// THÔNG SỐ ĐƠN
		body.put("height", 10);
		body.put("length", 30);
		body.put("width", 20);
		body.put("weight", 1000);

		body.put("insurance_value", insuranceValue);

		HttpHeaders headers = new HttpHeaders();
		headers.set("Token", ghnToken);
		headers.set("ShopId", ghnShopId);
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

		try {

			ResponseEntity<Map> response = restTemplate.postForEntity(FEE_URL, entity, Map.class);

			log.info("GHN Fee Response: {}", response.getBody());

			return response.getBody();

		} catch (HttpStatusCodeException e) {

			log.error("GHN API ERROR: {}", e.getResponseBodyAsString());

			return Map.of("code", 500, "message", e.getResponseBodyAsString());

		} catch (Exception e) {

			log.error("SYSTEM ERROR: ", e);

			return Map.of("code", 500, "message", e.getMessage());
		}
	}

	// =================== CALL API CHUNG ===================
	private Object callGHNApi(String url, Map<String, Object> body) {

		HttpHeaders headers = new HttpHeaders();
		headers.set("Token", ghnToken);
		headers.set("ShopId", ghnShopId);
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

		try {

			if (body == null) {

				ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

				return response.getBody();

			} else {

				ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

				return response.getBody();
			}

		} catch (Exception e) {

			log.error("GHN MASTER DATA ERROR:", e);

			return Map.of("code", 500, "message", e.getMessage());
		}
	}
}