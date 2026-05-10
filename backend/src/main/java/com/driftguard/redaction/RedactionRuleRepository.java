package com.driftguard.redaction;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RedactionRuleRepository extends JpaRepository<RedactionRule, UUID> {

    List<RedactionRule> findByService_IdOrderByCreatedAtDesc(UUID serviceId);
}
