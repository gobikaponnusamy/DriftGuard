package com.driftguard.auth;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class SecureApiKeyGenerator implements ApiKeyGenerator {

    private static final int KEY_BYTES = 32;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public String generate() {
        byte[] bytes = new byte[KEY_BYTES];
        secureRandom.nextBytes(bytes);
        return "dg_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
