package com.ShoeStore.repository;

import com.ShoeStore.model.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import java.util.List;


public interface VoucherRepository extends JpaRepository<Voucher, Integer> {
    @EntityGraph(attributePaths = {"applicableRanks"})
    Optional<Voucher> findByCode(String code);

    @Query("SELECT v FROM Voucher v LEFT JOIN FETCH v.applicableRanks")
    List<Voucher> findAllWithRanks();
}
