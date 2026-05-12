package com.driftguard.replay;

import com.driftguard.service.ReplayAuthType;

public record ReplayAuthConfig(
        ReplayAuthType type,
        String headerName,
        String value
) {
    public static ReplayAuthConfig none() {
        return new ReplayAuthConfig(ReplayAuthType.NONE, null, null);
    }
}
