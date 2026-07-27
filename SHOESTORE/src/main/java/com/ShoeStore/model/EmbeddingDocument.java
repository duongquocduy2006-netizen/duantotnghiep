package com.ShoeStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "product_embeddings")
public class EmbeddingDocument {

    @Id
    private String id;

    private Integer productId;

    private List<Double> embedding;

    public EmbeddingDocument() {
    }

    public EmbeddingDocument(String id, Integer productId, List<Double> embedding) {
        this.id = id;
        this.productId = productId;
        this.embedding = embedding;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public List<Double> getEmbedding() {
        return embedding;
    }

    public void setEmbedding(List<Double> embedding) {
        this.embedding = embedding;
    }
}