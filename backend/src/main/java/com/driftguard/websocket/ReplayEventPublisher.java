package com.driftguard.websocket;

import com.driftguard.replay.ReplayProgressEvent;
import java.util.UUID;

public interface ReplayEventPublisher {

    void publish(UUID sessionId, ReplayProgressEvent event);
}
