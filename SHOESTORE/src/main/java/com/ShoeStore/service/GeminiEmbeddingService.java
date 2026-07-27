package com.ShoeStore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiEmbeddingService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private static final String EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=";

    public List<Double> getEmbedding(byte[] imageBytes, String mimeType) throws Exception {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured.");
        }

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String finalMimeType = mimeType != null ? mimeType : "image/jpeg";

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> requestBody = new HashMap<>();

        Map<String, Object> inlineData = new HashMap<>();
        inlineData.put("mime_type", finalMimeType);
        inlineData.put("data", base64Image);

        Map<String, Object> part = new HashMap<>();
        part.put("inline_data", inlineData);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", Collections.singletonList(part));

        requestBody.put("content", content);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String fullUrl = EMBEDDING_API_URL + apiKey;

        ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, entity, String.class);

        if (response.getStatusCode() != HttpStatus.OK) {
            throw new RuntimeException("Failed to get embedding from Gemini API. Status: " + response.getStatusCode());
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode rootNode = mapper.readTree(response.getBody());

        JsonNode valuesNode = rootNode.path("embedding").path("values");
        if (valuesNode.isMissingNode() || !valuesNode.isArray()) {
            throw new RuntimeException("Invalid API response. Embedding values not found: " + response.getBody());
        }

        List<Double> embedding = new ArrayList<>();
        for (JsonNode val : valuesNode) {
            embedding.add(val.asDouble());
        }

        return embedding;
    }
}
