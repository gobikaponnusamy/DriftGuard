package com.driftguard.replay;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BaselinePromotionRepository extends JpaRepository<BaselinePromotion, UUID> {

    List<BaselinePromotion> findBySession_Id(UUID sessionId);

    List<BaselinePromotion> findBySession_IdOrderByPromotedAtDesc(UUID sessionId);

    boolean existsBySession_Id(UUID sessionId);

    List<BaselinePromotion> findByService_IdOrderByPromotedAtDesc(UUID serviceId);
}
