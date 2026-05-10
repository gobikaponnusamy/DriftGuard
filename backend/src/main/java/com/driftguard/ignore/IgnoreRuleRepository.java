package com.driftguard.ignore;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IgnoreRuleRepository extends JpaRepository<IgnoreRule, UUID> {

    List<IgnoreRule> findByService_IdOrderByCreatedAtDesc(UUID serviceId);
}
