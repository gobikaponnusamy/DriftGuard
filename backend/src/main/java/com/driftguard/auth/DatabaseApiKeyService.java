package com.driftguard.auth;

import com.driftguard.service.ServiceRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

@org.springframework.stereotype.Service
public class DatabaseApiKeyService implements ApiKeyService {

    private final ServiceRepository serviceRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseApiKeyService(
            ServiceRepository serviceRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.serviceRepository = serviceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public boolean isValid(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return false;
        }
        return serviceRepository.findAll().stream()
                .anyMatch(service -> passwordEncoder.matches(apiKey, service.getApiKeyHash()));
    }
}
