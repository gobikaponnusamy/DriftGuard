package com.driftguard.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class HmacJwtTokenService implements JwtTokenService {

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final String issuer;
    private final long ttlSeconds;

    public HmacJwtTokenService(
            ObjectMapper objectMapper,
            @Value("${driftguard.jwt.secret}") String secret,
            @Value("${driftguard.jwt.issuer}") String issuer,
            @Value("${driftguard.jwt.ttl-seconds}") long ttlSeconds
    ) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer;
        this.ttlSeconds = ttlSeconds;
    }

    @Override
    public JwtToken issue(AppUser user) {
        Instant expiresAt = Instant.now().plusSeconds(ttlSeconds);
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", issuer);
        claims.put("sub", user.getId().toString());
        claims.put("email", user.getEmail());
        claims.put("name", user.getDisplayName());
        claims.put("role", user.getRole());
        claims.put("exp", expiresAt.getEpochSecond());

        String headerPart = encodeJson(header);
        String claimsPart = encodeJson(claims);
        String signingInput = headerPart + "." + claimsPart;
        return new JwtToken(signingInput + "." + sign(signingInput), expiresAt);
    }

    @Override
    public boolean isValid(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        String token = authorizationHeader.substring("Bearer ".length()).trim();
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }

        String signingInput = parts[0] + "." + parts[1];
        if (!MessageDigest.isEqual(sign(signingInput).getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8))) {
            return false;
        }

        try {
            Map<String, Object> claims = objectMapper.readValue(
                    DECODER.decode(parts[1]), new TypeReference<>() {});
            if (!issuer.equals(claims.get("iss"))) {
                return false;
            }
            Number exp = (Number) claims.get("exp");
            return exp != null && Instant.now().isBefore(Instant.ofEpochSecond(exp.longValue()));
        } catch (RuntimeException | java.io.IOException ex) {
            return false;
        }
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("Unable to encode JWT", ex);
        }
    }

    private String sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return ENCODER.encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }
}
