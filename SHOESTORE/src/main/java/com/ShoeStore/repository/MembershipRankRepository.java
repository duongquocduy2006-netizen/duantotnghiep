package com.ShoeStore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ShoeStore.model.MembershipRank;

public interface MembershipRankRepository extends JpaRepository<MembershipRank, Integer> {
}
