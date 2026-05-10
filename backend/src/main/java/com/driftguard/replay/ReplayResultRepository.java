package com.driftguard.replay;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReplayResultRepository extends JpaRepository<ReplayResult, UUID> {

    List<ReplayResult> findBySession_Id(UUID sessionId);
}
