package com.driftguard.ignore;

import com.driftguard.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IgnoreRuleController {

    private final IgnoreRuleService ignoreRuleService;

    public IgnoreRuleController(IgnoreRuleService ignoreRuleService) {
        this.ignoreRuleService = ignoreRuleService;
    }

    @PostMapping("/api/ignore-rules/{serviceId}")
    public ResponseEntity<ApiResponse<IgnoreRuleResponse>> add(
            @PathVariable UUID serviceId,
            @Valid @RequestBody AddIgnoreRuleRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(ignoreRuleService.add(serviceId, request)));
    }

    @GetMapping("/api/ignore-rules/{serviceId}")
    public ApiResponse<List<IgnoreRuleResponse>> list(@PathVariable UUID serviceId) {
        return ApiResponse.success(ignoreRuleService.list(serviceId));
    }

    @DeleteMapping("/api/ignore-rules/{serviceId}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID serviceId,
            @PathVariable UUID id
    ) {
        ignoreRuleService.delete(serviceId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
