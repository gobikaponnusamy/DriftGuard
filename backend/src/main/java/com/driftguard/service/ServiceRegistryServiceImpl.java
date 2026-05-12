package com.driftguard.service;

import com.driftguard.auth.ApiKeyGenerator;
import com.driftguard.common.BadRequestException;
import com.driftguard.common.ConflictException;
import com.driftguard.common.ResourceNotFoundException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class ServiceRegistryServiceImpl implements ServiceRegistryService {

    private final ServiceRepository serviceRepository;
    private final ApiKeyGenerator apiKeyGenerator;
    private final PasswordEncoder passwordEncoder;

    public ServiceRegistryServiceImpl(
            ServiceRepository serviceRepository,
            ApiKeyGenerator apiKeyGenerator,
            PasswordEncoder passwordEncoder
    ) {
        this.serviceRepository = serviceRepository;
        this.apiKeyGenerator = apiKeyGenerator;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public ServiceRegistrationResponse register(RegisterServiceRequest request) {
        String name = request.name().trim();
        String baseUrl = request.baseUrl().trim();
        validateHttpUrl(baseUrl);
        ReplayAuthType replayAuthType = request.replayAuthType() == null
                ? ReplayAuthType.NONE
                : request.replayAuthType();
        String replayAuthHeaderName = normalize(request.replayAuthHeaderName());
        String replayAuthValue = normalize(request.replayAuthValue());
        validateReplayAuth(replayAuthType, replayAuthHeaderName, replayAuthValue);
        if (serviceRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Service already exists: " + name);
        }

        String apiKey = apiKeyGenerator.generate();
        String apiKeyHash = passwordEncoder.encode(apiKey);
        RegisteredService service = new RegisteredService(
                name,
                baseUrl,
                apiKeyHash,
                replayAuthType,
                replayAuthHeaderName,
                replayAuthValue
        );
        RegisteredService saved = serviceRepository.saveAndFlush(service);
        return ServiceRegistrationResponse.fromEntity(saved, apiKey);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RegisteredServiceResponse> list() {
        return serviceRepository.findAll().stream()
                .map(RegisteredServiceResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void delete(UUID serviceId) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        serviceRepository.delete(service);
    }

    private void validateHttpUrl(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            if (scheme == null || uri.getHost() == null
                    || (!scheme.equals("http") && !scheme.equals("https"))) {
                throw new BadRequestException("baseUrl must be an absolute HTTP or HTTPS URL");
            }
        } catch (URISyntaxException ex) {
            throw new BadRequestException("baseUrl must be a valid URL");
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void validateReplayAuth(ReplayAuthType type, String headerName, String value) {
        if (type == ReplayAuthType.NONE) {
            return;
        }
        if (value == null) {
            throw new BadRequestException("Replay authentication value is required");
        }
        if ((type == ReplayAuthType.API_KEY_HEADER || type == ReplayAuthType.CUSTOM_HEADER)
                && headerName == null) {
            throw new BadRequestException("Replay authentication header name is required");
        }
    }
}
