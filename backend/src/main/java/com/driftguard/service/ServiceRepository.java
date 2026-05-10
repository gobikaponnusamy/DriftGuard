package com.driftguard.service;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceRepository extends JpaRepository<RegisteredService, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<RegisteredService> findByNameIgnoreCase(String name);
}
