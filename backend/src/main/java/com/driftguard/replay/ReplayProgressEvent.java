package com.driftguard.replay;

import com.driftguard.common.DriftType;
import java.util.UUID;

public record ReplayProgressEvent(
        UUID baselineId,
        String path,
        DriftType driftType,
        String status,
        int progress,
        int total,
        Integer driftedCount
) {
    public static ReplayProgressEvent requestDone(
            UUID baselineId,
            String path,
            DriftType driftType,
            int progress,
            int total
    ) {
        return new ReplayProgressEvent(baselineId, path, driftType, "done", progress, total, null);
    }

    public static ReplayProgressEvent completed(int total, int driftedCount) {
        return new ReplayProgressEvent(null, null, null, "completed", total, total, driftedCount);
    }
}
