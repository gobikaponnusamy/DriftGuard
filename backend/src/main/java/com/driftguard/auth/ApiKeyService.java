package com.driftguard.auth;

public interface ApiKeyService {

    boolean isValid(String apiKey);
}
