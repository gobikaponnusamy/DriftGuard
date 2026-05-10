package com.driftguard.replay;

import java.util.UUID;

public interface ReplayStateStore {

    void markRunning(UUID sessionId, int total);

    void updateProgress(UUID sessionId, int progress, int total, int driftedCount);

    void markCompleted(UUID sessionId, int total, int driftedCount);

    void markFailed(UUID sessionId);
}
