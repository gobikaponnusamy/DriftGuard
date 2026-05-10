package com.driftguard.replay;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReplaySessionRepository extends JpaRepository<ReplaySession, UUID> {

    List<ReplaySession> findByService_IdOrderByTriggeredAtDesc(UUID serviceId);
}
