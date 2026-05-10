package com.driftguard.auth;

import com.driftguard.common.ApiResponse;
import com.driftguard.service.RegisterServiceRequest;
import com.driftguard.service.ServiceRegistrationResponse;
import com.driftguard.service.ServiceRegistryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ServiceRegistryService serviceRegistryService;

    public AuthController(AuthService authService, ServiceRegistryService serviceRegistryService) {
        this.authService = authService;
        this.serviceRegistryService = serviceRegistryService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<ServiceRegistrationResponse>> register(
            @Valid @RequestBody RegisterServiceRequest request
    ) {
        ServiceRegistrationResponse response = serviceRegistryService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
