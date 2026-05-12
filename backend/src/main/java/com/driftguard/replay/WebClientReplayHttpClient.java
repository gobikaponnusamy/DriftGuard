package com.driftguard.replay;

import com.driftguard.recorder.Baseline;
import com.driftguard.service.ReplayAuthType;
import java.net.URI;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class WebClientReplayHttpClient implements ReplayHttpClient {

    private static final int CLIENT_ERROR_STATUS = 599;

    private final WebClient.Builder webClientBuilder;

    public WebClientReplayHttpClient(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public ReplayedHttpResponse replay(String stagingUrl, Baseline baseline, ReplayAuthConfig replayAuth) {
        long started = System.nanoTime();
        try {
            HttpMethod method = HttpMethod.valueOf(baseline.getMethod().toUpperCase(Locale.ROOT));
            WebClient.RequestBodySpec spec = webClientBuilder.build()
                    .method(method)
                    .uri(targetUri(stagingUrl, baseline.getPath()))
                    .headers(headers -> {
                        baseline.getRequestHeaders()
                                .forEach((key, value) -> headers.set(key, String.valueOf(value)));
                        applyReplayAuth(headers, replayAuth);
                    });

            WebClient.RequestHeadersSpec<?> request = shouldSendBody(method, baseline.getRequestBody())
                    ? spec.bodyValue(baseline.getRequestBody())
                    : spec;

            return request.exchangeToMono(response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .map(body -> new ReplayedHttpResponse(
                                    response.statusCode().value(),
                                    flattenHeaders(response.headers().asHttpHeaders()),
                                    body,
                                    elapsedMs(started)
                            )))
                    .block(Duration.ofSeconds(30));
        } catch (Exception ex) {
            return new ReplayedHttpResponse(
                    CLIENT_ERROR_STATUS,
                    Map.of(),
                    "{\"error\":\"" + sanitize(ex.getMessage()) + "\"}",
                    elapsedMs(started)
            );
        }
    }

    private URI targetUri(String stagingUrl, String path) {
        String base = stagingUrl.endsWith("/") ? stagingUrl.substring(0, stagingUrl.length() - 1) : stagingUrl;
        String suffix = path.startsWith("/") ? path : "/" + path;
        return URI.create(base + suffix);
    }

    private void applyReplayAuth(org.springframework.http.HttpHeaders headers, ReplayAuthConfig replayAuth) {
        if (replayAuth == null || replayAuth.type() == null || replayAuth.type() == ReplayAuthType.NONE
                || replayAuth.value() == null || replayAuth.value().isBlank()) {
            return;
        }
        switch (replayAuth.type()) {
            case BEARER_TOKEN -> headers.setBearerAuth(replayAuth.value());
            case API_KEY_HEADER, CUSTOM_HEADER -> headers.set(replayAuth.headerName(), replayAuth.value());
            case BASIC_AUTH -> headers.setBasicAuth(encodedBasicAuth(replayAuth.value()));
            case NONE -> {
            }
        }
    }

    private String encodedBasicAuth(String value) {
        if (value.startsWith("Basic ")) {
            return value.substring("Basic ".length());
        }
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private boolean shouldSendBody(HttpMethod method, String body) {
        if (body == null || body.isBlank()) {
            return false;
        }
        return method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH;
    }

    private Map<String, Object> flattenHeaders(org.springframework.http.HttpHeaders headers) {
        Map<String, Object> result = new LinkedHashMap<>();
        headers.forEach((key, values) -> result.put(key, values.size() == 1 ? values.getFirst() : values));
        return result;
    }

    private long elapsedMs(long started) {
        return Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    private String sanitize(String message) {
        if (message == null || message.isBlank()) {
            return "Replay request failed";
        }
        return message.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
