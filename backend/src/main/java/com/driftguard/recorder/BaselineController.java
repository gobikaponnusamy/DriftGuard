package com.driftguard.recorder;

import com.driftguard.common.ApiResponse;
import com.driftguard.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BaselineController {

    private final BaselineRecorderService baselineRecorderService;

    public BaselineController(BaselineRecorderService baselineRecorderService) {
        this.baselineRecorderService = baselineRecorderService;
    }

    @PostMapping("/api/record/{serviceId}")
    public ResponseEntity<ApiResponse<BaselineResponse>> record(
            @PathVariable UUID serviceId,
            @Valid @RequestBody RecordBaselineRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(baselineRecorderService.record(serviceId, request)));
    }

    @GetMapping("/api/baselines/{serviceId}")
    public ApiResponse<PageResponse<BaselineResponse>> list(
            @PathVariable UUID serviceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "capturedAt"));
        return ApiResponse.success(baselineRecorderService.list(serviceId, pageable));
    }

    @GetMapping("/api/baselines/{serviceId}/{id}")
    public ApiResponse<BaselineResponse> get(
            @PathVariable UUID serviceId,
            @PathVariable UUID id
    ) {
        return ApiResponse.success(baselineRecorderService.get(serviceId, id));
    }

    @PutMapping("/api/baselines/{serviceId}/{id}")
    public ApiResponse<BaselineResponse> update(
            @PathVariable UUID serviceId,
            @PathVariable UUID id,
            @Valid @RequestBody RecordBaselineRequest request
    ) {
        return ApiResponse.success(baselineRecorderService.update(serviceId, id, request));
    }

    @DeleteMapping("/api/baselines/{serviceId}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID serviceId,
            @PathVariable UUID id
    ) {
        baselineRecorderService.delete(serviceId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
