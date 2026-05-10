package com.driftguard.webhook;

import com.driftguard.common.ApiResponse;
import com.driftguard.common.DriftType;
import com.driftguard.replay.ReplayResultResponse;
import com.driftguard.replay.ReplaySessionResponse;
import com.driftguard.replay.ReplayService;
import com.driftguard.replay.ReplayStatus;
import com.driftguard.replay.TriggerReplayRequest;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebhookController {

    private final ReplayService replayService;

    public WebhookController(ReplayService replayService) {
        this.replayService = replayService;
    }

    @PostMapping("/api/webhooks/deploy")
    public ResponseEntity<ApiResponse<DeployWebhookResponse>> deploy(
            @Valid @RequestBody DeployWebhookRequest request
    ) {
        ReplaySessionResponse session = replayService.trigger(
                new TriggerReplayRequest(request.serviceId(), request.stagingUrl()));
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(new DeployWebhookResponse(
                        session.id(),
                        "/api/webhooks/deploy/" + session.id() + "/gate",
                        "PENDING",
                        "Replay started. Poll the gate URL or use /api/webhooks/deploy/gate for a blocking CI check."
                )));
    }

    @PostMapping("/api/webhooks/deploy/gate")
    public ResponseEntity<ApiResponse<DeployGateResponse>> deployGate(
            @Valid @RequestBody DeployWebhookRequest request
    ) {
        ReplaySessionResponse session = replayService.trigger(
                new TriggerReplayRequest(request.serviceId(), request.stagingUrl()));
        DeployGateResponse gate = waitForGate(session.id(), request);
        return ResponseEntity.status(statusFor(gate)).body(ApiResponse.success(gate));
    }

    @GetMapping("/api/webhooks/deploy/{sessionId}/gate")
    public ResponseEntity<ApiResponse<DeployGateResponse>> gateStatus(@PathVariable UUID sessionId) {
        DeployGateResponse gate = evaluateGate(sessionId, true, false);
        return ResponseEntity.status(statusFor(gate)).body(ApiResponse.success(gate));
    }

    private DeployGateResponse waitForGate(UUID sessionId, DeployWebhookRequest request) {
        long deadline = System.nanoTime() + request.waitSeconds() * 1_000_000_000L;
        DeployGateResponse gate = evaluateGate(sessionId, request.shouldFailOnBreaking(), request.shouldFailOnAnyDrift());
        while ((gate.status() == ReplayStatus.PENDING || gate.status() == ReplayStatus.RUNNING)
                && System.nanoTime() < deadline) {
            sleepQuietly();
            gate = evaluateGate(sessionId, request.shouldFailOnBreaking(), request.shouldFailOnAnyDrift());
        }
        if (gate.status() == ReplayStatus.PENDING || gate.status() == ReplayStatus.RUNNING) {
            return new DeployGateResponse(sessionId, gate.status(), gate.totalRequests(), gate.driftedCount(),
                    gate.breakingCount(), gate.warningCount(), gate.performanceCount(), "PENDING",
                    "Replay is still running. Keep polling the gate URL.");
        }
        return gate;
    }

    private DeployGateResponse evaluateGate(UUID sessionId, boolean failOnBreaking, boolean failOnAnyDrift) {
        ReplaySessionResponse session = replayService.getSession(sessionId);
        List<ReplayResultResponse> results = replayService.listResults(sessionId);
        long breaking = count(results, DriftType.BREAKING);
        long warning = count(results, DriftType.WARNING);
        long performance = count(results, DriftType.PERFORMANCE);
        String decision = decision(session.status(), session.driftedCount(), breaking, failOnBreaking, failOnAnyDrift);
        return new DeployGateResponse(sessionId, session.status(), session.totalRequests(), session.driftedCount(),
                breaking, warning, performance, decision, message(decision));
    }

    private long count(List<ReplayResultResponse> results, DriftType driftType) {
        return results.stream().filter(result -> result.driftType() == driftType).count();
    }

    private String decision(
            ReplayStatus status,
            int driftedCount,
            long breaking,
            boolean failOnBreaking,
            boolean failOnAnyDrift
    ) {
        if (status == ReplayStatus.FAILED) {
            return "BLOCK";
        }
        if (status != ReplayStatus.DONE) {
            return "PENDING";
        }
        if ((failOnBreaking && breaking > 0) || (failOnAnyDrift && driftedCount > 0)) {
            return "BLOCK";
        }
        return "ALLOW";
    }

    private String message(String decision) {
        return switch (decision) {
            case "ALLOW" -> "Deploy gate passed.";
            case "BLOCK" -> "Deploy gate failed. Blocking release.";
            default -> "Deploy gate is waiting for replay completion.";
        };
    }

    private HttpStatus statusFor(DeployGateResponse gate) {
        return switch (gate.decision()) {
            case "ALLOW" -> HttpStatus.OK;
            case "BLOCK" -> HttpStatus.CONFLICT;
            default -> HttpStatus.ACCEPTED;
        };
    }

    private void sleepQuietly() {
        try {
            Thread.sleep(1_000);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
