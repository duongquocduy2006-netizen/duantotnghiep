package com.ShoeStore;

import com.ShoeStore.service.ImageEmbeddingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;

@SpringBootTest
class ShoeStoreJava5AsmApplicationTests {

    @Autowired
    private ImageEmbeddingService imageEmbeddingService;

    @Autowired
    private MongoDatabaseFactory mongoDatabaseFactory;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Test
    void testImageEmbeddingServiceMongo() {
        System.out.println("========== IMAGE EMBEDDING SERVICE TEST ==========");
        System.out.println("Test MongoDatabaseFactory DB = " + mongoDatabaseFactory.getMongoDatabase().getName());
        System.out.println("Test MongoDatabaseFactory IdentityHashCode = " + System.identityHashCode(mongoDatabaseFactory));
        System.out.println("Test MongoTemplate DB = " + mongoTemplate.getDb().getName());
        System.out.println("Test MongoTemplate IdentityHashCode = " + System.identityHashCode(mongoTemplate));

        System.out.println("--- CALLING generateEmbeddingForProduct(7) ---");
        try {
            String res = imageEmbeddingService.generateEmbeddingForProduct(7);
            System.out.println("Result: " + res);
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
        }
        System.out.println("==================================================");
    }
}





