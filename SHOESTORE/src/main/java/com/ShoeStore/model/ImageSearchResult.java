package com.ShoeStore.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class ImageSearchResult {
    private String brand;
    private String category;
    private String color;

    public String getBrand() {
        return brand != null ? brand : "";
    }

    public String getCategory() {
        return category != null ? category : "";
    }

    public String getColor() {
        return color != null ? color : "";
    }
}
// rebuild
