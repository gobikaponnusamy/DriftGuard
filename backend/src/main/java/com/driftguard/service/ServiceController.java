package com.driftguard.service;

import com.driftguard.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceRegistryService serviceRegistryService;

    public ServiceController(ServiceRegistryService serviceRegistryService) {
        this.serviceRegistryService = serviceRegistryService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceRegistrationResponse>> register(
            @Valid @RequestBody RegisterServiceRequest request
    ) {
        ServiceRegistrationResponse response = serviceRegistryService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ApiResponse<List<RegisteredServiceResponse>> list() {
        return ApiResponse.success(serviceRegistryService.list());
    }
}
