package com.driftguard.demo;

import com.driftguard.common.ApiResponse;
import com.driftguard.replay.ReplaySessionResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/api/demo/capture/{serviceId}")
    public ApiResponse<DemoCaptureResponse> capture(@PathVariable UUID serviceId) {
        return ApiResponse.success(demoService.capture(serviceId));
    }

    @PostMapping("/api/demo/replay/{serviceId}")
    public ResponseEntity<ApiResponse<ReplaySessionResponse>> replay(@PathVariable UUID serviceId) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(demoService.replay(serviceId)));
    }

    @PostMapping("/api/demo/run/{serviceId}")
    public ResponseEntity<ApiResponse<DemoRunResponse>> run(@PathVariable UUID serviceId) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(demoService.run(serviceId)));
    }
}
