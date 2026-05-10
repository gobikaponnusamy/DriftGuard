package com.driftguard.config;

import com.driftguard.websocket.ReplayWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ReplayWebSocketHandler replayWebSocketHandler;
    private final CorsProperties corsProperties;

    public WebSocketConfig(
            ReplayWebSocketHandler replayWebSocketHandler,
            CorsProperties corsProperties
    ) {
        this.replayWebSocketHandler = replayWebSocketHandler;
        this.corsProperties = corsProperties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(replayWebSocketHandler, "/ws/replay/{sessionId}")
                .setAllowedOrigins(resolveOrigins());
    }

    private String[] resolveOrigins() {
        String configured = corsProperties.allowedOrigins();
        if (configured == null || configured.isBlank()) {
            return new String[]{"http://localhost:3000"};
        }
        return java.util.Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }
}
