package com.driftguard.redaction;

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
public class RedactionRuleController {

    private final RedactionRuleService redactionRuleService;

    public RedactionRuleController(RedactionRuleService redactionRuleService) {
        this.redactionRuleService = redactionRuleService;
    }

    @PostMapping("/api/redaction-rules/{serviceId}")
    public ResponseEntity<ApiResponse<RedactionRuleResponse>> add(
            @PathVariable UUID serviceId,
            @Valid @RequestBody AddRedactionRuleRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(redactionRuleService.add(serviceId, request)));
    }

    @GetMapping("/api/redaction-rules/{serviceId}")
    public ApiResponse<List<RedactionRuleResponse>> list(@PathVariable UUID serviceId) {
        return ApiResponse.success(redactionRuleService.list(serviceId));
    }

    @DeleteMapping("/api/redaction-rules/{serviceId}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID serviceId,
            @PathVariable UUID id
    ) {
        redactionRuleService.delete(serviceId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
