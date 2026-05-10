package com.driftguard.replay;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisReplayStateStore implements ReplayStateStore {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisReplayStateStore(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void markRunning(UUID sessionId, int total) {
        write(sessionId, Map.of("status", "RUNNING", "progress", 0, "total", total));
    }

    @Override
    public void updateProgress(UUID sessionId, int progress, int total, int driftedCount) {
        write(sessionId, Map.of(
                "status", "RUNNING",
                "progress", progress,
                "total", total,
                "driftedCount", driftedCount
        ));
    }

    @Override
    public void markCompleted(UUID sessionId, int total, int driftedCount) {
        write(sessionId, Map.of(
                "status", "DONE",
                "progress", total,
                "total", total,
                "driftedCount", driftedCount
        ));
    }

    @Override
    public void markFailed(UUID sessionId) {
        write(sessionId, Map.of("status", "FAILED"));
    }

    private void write(UUID sessionId, Map<String, Object> state) {
        try {
            Map<String, Object> payload = new java.util.LinkedHashMap<>(state);
            payload.put("updatedAt", Instant.now().toString());
            redisTemplate.opsForValue().set(key(sessionId), objectMapper.writeValueAsString(payload));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to write replay state", ex);
        }
    }

    private String key(UUID sessionId) {
        return "replay:session:" + sessionId;
    }
}
