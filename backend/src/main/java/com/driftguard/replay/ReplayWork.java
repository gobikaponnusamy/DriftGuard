package com.driftguard.replay;

import com.driftguard.recorder.Baseline;
import java.util.List;
import java.util.UUID;

public record ReplayWork(
        UUID sessionId,
        UUID serviceId,
        String stagingUrl,
        ReplayAuthConfig replayAuth,
        List<Baseline> baselines
) {
}
