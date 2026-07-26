package com.ShoeStore.repository;

import com.ShoeStore.model.EmbeddingDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmbeddingRepository extends MongoRepository<EmbeddingDocument, String> {
    Optional<EmbeddingDocument> findByProductId(Integer productId);

    void deleteByProductId(Integer productId);
}
