package com.driftguard.report;

import com.driftguard.common.ApiResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/api/reports/{serviceId}/timeline")
    public ApiResponse<List<TimelinePointResponse>> timeline(@PathVariable UUID serviceId) {
        return ApiResponse.success(reportService.timeline(serviceId));
    }

    @GetMapping("/api/reports/{serviceId}/readiness")
    public ApiResponse<ReleaseReadinessResponse> readiness(@PathVariable UUID serviceId) {
        return ApiResponse.success(reportService.readiness(serviceId));
    }
}
