package com.driftguard.auth;

import com.driftguard.common.UnauthorizedException;
import org.springframework.security.crypto.password.PasswordEncoder;

@org.springframework.stereotype.Service
public class AuthServiceImpl implements AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthServiceImpl(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        AppUser user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }
        JwtToken token = jwtTokenService.issue(user);
        return new LoginResponse(user.getId(), user.getEmail(), user.getDisplayName(),
                user.getRole(), token.value(), "Bearer", token.expiresAt());
    }
}
