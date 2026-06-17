package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.ShoeStore.model.Lookbook;
import java.util.List;

@Repository
public interface LookbookRepository extends JpaRepository<Lookbook, Long> {
    List<Lookbook> findByStatusTrueOrderByIdDesc();
    List<Lookbook> findAllByOrderByIdDesc();
}
