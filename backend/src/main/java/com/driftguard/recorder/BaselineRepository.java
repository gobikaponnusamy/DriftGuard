package com.driftguard.recorder;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BaselineRepository extends JpaRepository<Baseline, UUID> {

    Page<Baseline> findByService_Id(UUID serviceId, Pageable pageable);

    long countByService_Id(UUID serviceId);

    List<Baseline> findByService_IdOrderByCapturedAtAsc(UUID serviceId);

    Optional<Baseline> findFirstByService_IdAndMethodIgnoreCaseAndPathOrderByCapturedAtDesc(
            UUID serviceId,
            String method,
            String path
    );
}
