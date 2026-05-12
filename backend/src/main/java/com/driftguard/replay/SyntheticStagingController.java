package com.driftguard.replay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.driftguard.recorder.Baseline;
import com.driftguard.recorder.BaselineRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SyntheticStagingController {

    private final BaselineRepository baselineRepository;
    private final ObjectMapper objectMapper;

    public SyntheticStagingController(BaselineRepository baselineRepository, ObjectMapper objectMapper) {
        this.baselineRepository = baselineRepository;
        this.objectMapper = objectMapper;
    }

    @RequestMapping(value = "/synthetic-staging/{serviceId}/**", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> replayBaseline(
            @org.springframework.web.bind.annotation.PathVariable UUID serviceId,
            HttpServletRequest request
    ) {
        String path = request.getRequestURI().replaceFirst("^/synthetic-staging/" + serviceId, "");
        Baseline baseline = baselineRepository
                .findFirstByService_IdAndMethodIgnoreCaseAndPathOrderByCapturedAtDesc(
                        serviceId,
                        request.getMethod(),
                        path.isBlank() ? "/" : path
                )
                .orElse(null);
        if (baseline == null) {
            return ResponseEntity.status(404)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"No synthetic baseline found for this method and path\"}");
        }
        simulateLatency(path);
        return ResponseEntity.status(baseline.getResponseStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(applySyntheticDrift(baseline, serviceId));
    }

    private String applySyntheticDrift(Baseline baseline, UUID serviceId) {
        String body = baseline.getResponseBody();
        if (body == null || body.isBlank()) {
            return "{}";
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            if (!(node instanceof ObjectNode objectNode)) {
                return body;
            }
            int profile = Math.floorMod((baseline.getMethod() + baseline.getPath()).hashCode(), 5);
            objectNode.put("stagingBuild", "candidate-" + serviceId.toString().substring(0, 8));
            objectNode.put("traceId", "stg-" + baseline.getId().toString().substring(0, 12));
            switch (profile) {
                case 0 -> moveField(objectNode, "timestamp", "serverTime");
                case 1 -> normalizeMoney(objectNode, "price");
                case 2 -> normalizeMoney(objectNode, "total");
                case 3 -> objectNode.put("status", objectNode.path("status").asText("ok") + "_staging");
                default -> objectNode.put("releaseCandidate", true);
            }
            return objectMapper.writeValueAsString(objectNode);
        } catch (Exception ignored) {
            return body
                    .replace("\"status\":\"confirmed\"", "\"status\":\"confirmed_staging\"")
                    .replace("\"price\":\"99.0\"", "\"price\":\"99\"")
                    .replace("\"total\":\"99.0\"", "\"total\":\"99\"")
                    .replace("\"timestamp\":", "\"serverTime\":");
        }
    }

    private void moveField(ObjectNode objectNode, String from, String to) {
        JsonNode value = objectNode.remove(from);
        if (value != null) {
            objectNode.set(to, value);
        }
    }

    private void normalizeMoney(ObjectNode objectNode, String fieldName) {
        JsonNode value = objectNode.get(fieldName);
        if (value != null && value.isTextual()) {
            try {
                objectNode.put(fieldName, Double.parseDouble(value.asText()));
            } catch (NumberFormatException ignored) {
                objectNode.put(fieldName, value.asText().replace(".0", ""));
            }
        }
    }

    private void simulateLatency(String path) {
        if (Math.floorMod(path.hashCode(), 7) != 0) {
            return;
        }
        try {
            Thread.sleep(180);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }
}
