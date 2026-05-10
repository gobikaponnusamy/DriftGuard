package com.driftguard.auth;

import com.driftguard.common.ApiError;
import com.driftguard.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    public static final String API_KEY_HEADER = "X-API-Key";

    private final ApiKeyService apiKeyService;
    private final JwtTokenService jwtTokenService;
    private final ObjectMapper objectMapper;

    public ApiKeyAuthFilter(
            ApiKeyService apiKeyService,
            JwtTokenService jwtTokenService,
            ObjectMapper objectMapper
    ) {
        this.apiKeyService = apiKeyService;
        this.jwtTokenService = jwtTokenService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!requiresApiKey(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isAuthenticated(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        writeUnauthorized(response);
    }

    private boolean isAuthenticated(HttpServletRequest request) {
        String apiKey = request.getHeader(API_KEY_HEADER);
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        return apiKeyService.isValid(apiKey) || jwtTokenService.isValid(authorization);
    }

    private boolean requiresApiKey(HttpServletRequest request) {
        String path = request.getServletPath();
        String method = request.getMethod();

        if (HttpMethod.OPTIONS.matches(method)) {
            return false;
        }
        if (!path.startsWith("/api/")) {
            return false;
        }
        return !isPublicEndpoint(path, method);
    }

    private boolean isPublicEndpoint(String path, String method) {
        return HttpMethod.POST.matches(method)
                && ("/api/auth/login".equals(path) || "/api/auth/register".equals(path));
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        ApiError error = ApiError.of("UNAUTHORIZED", "Missing or invalid API key/JWT");
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.failure(error));
    }
}
