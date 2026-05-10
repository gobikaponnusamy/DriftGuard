package com.driftguard.auth;

public interface JwtTokenService {

    JwtToken issue(AppUser user);

    boolean isValid(String authorizationHeader);
}
