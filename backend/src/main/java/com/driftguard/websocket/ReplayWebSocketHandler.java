package com.driftguard.websocket;

import com.driftguard.replay.ReplayProgressEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ReplayWebSocketHandler extends TextWebSocketHandler implements ReplayEventPublisher {

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public ReplayWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessionId(session).ifPresent(id ->
                sessions.computeIfAbsent(id, ignored -> ConcurrentHashMap.newKeySet()).add(session));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionId(session).ifPresent(id -> {
            Set<WebSocketSession> active = sessions.get(id);
            if (active != null) {
                active.remove(session);
            }
        });
    }

    @Override
    public void publish(UUID sessionId, ReplayProgressEvent event) {
        Set<WebSocketSession> active = sessions.getOrDefault(sessionId, Set.of());
        if (active.isEmpty()) {
            return;
        }
        try {
            TextMessage message = new TextMessage(objectMapper.writeValueAsString(event));
            for (WebSocketSession session : active) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to publish replay event", ex);
        }
    }

    private java.util.Optional<UUID> sessionId(WebSocketSession session) {
        String path = session.getUri() == null ? "" : session.getUri().getPath();
        String prefix = "/ws/replay/";
        if (!path.startsWith(prefix)) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(UUID.fromString(path.substring(prefix.length())));
    }
}
