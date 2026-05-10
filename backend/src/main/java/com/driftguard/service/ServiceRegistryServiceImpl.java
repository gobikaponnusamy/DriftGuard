package com.driftguard.service;

import com.driftguard.auth.ApiKeyGenerator;
import com.driftguard.common.BadRequestException;
import com.driftguard.common.ConflictException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
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
        if (serviceRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Service already exists: " + name);
        }

        String apiKey = apiKeyGenerator.generate();
        String apiKeyHash = passwordEncoder.encode(apiKey);
        RegisteredService service = new RegisteredService(name, baseUrl, apiKeyHash);
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
}
