package com.driftguard.replay;

import com.driftguard.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReplayController {

    private final ReplayService replayService;

    public ReplayController(ReplayService replayService) {
        this.replayService = replayService;
    }

    @PostMapping("/api/replay")
    public ResponseEntity<ApiResponse<ReplaySessionResponse>> trigger(
            @Valid @RequestBody TriggerReplayRequest request
    ) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(replayService.trigger(request)));
    }

    @GetMapping("/api/replay/{sessionId}")
    public ApiResponse<ReplaySessionResponse> getSession(@PathVariable UUID sessionId) {
        return ApiResponse.success(replayService.getSession(sessionId));
    }

    @GetMapping("/api/replay/{sessionId}/results")
    public ApiResponse<List<ReplayResultResponse>> listResults(@PathVariable UUID sessionId) {
        return ApiResponse.success(replayService.listResults(sessionId));
    }

    @GetMapping("/api/replay/{sessionId}/results/{id}")
    public ApiResponse<ReplayResultResponse> getResult(
            @PathVariable UUID sessionId,
            @PathVariable UUID id
    ) {
        return ApiResponse.success(replayService.getResult(sessionId, id));
    }

    @PatchMapping("/api/replay/{sessionId}/results/{id}/triage")
    public ApiResponse<ReplayResultResponse> updateTriage(
            @PathVariable UUID sessionId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTriageRequest request
    ) {
        return ApiResponse.success(replayService.updateTriage(sessionId, id, request));
    }

    @PostMapping("/api/replay/{sessionId}/promote")
    public ApiResponse<BaselinePromotionResponse> promote(
            @PathVariable UUID sessionId,
            @RequestBody PromoteBaselineRequest request
    ) {
        return ApiResponse.success(replayService.promote(sessionId, request));
    }

    @GetMapping("/api/replay/{sessionId}/promotions")
    public ApiResponse<List<BaselinePromotionResponse>> promotions(@PathVariable UUID sessionId) {
        return ApiResponse.success(replayService.listPromotions(sessionId));
    }
}
