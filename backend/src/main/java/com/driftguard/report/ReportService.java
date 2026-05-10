package com.driftguard.report;

import java.util.List;
import java.util.UUID;

public interface ReportService {

    List<TimelinePointResponse> timeline(UUID serviceId);

    ReleaseReadinessResponse readiness(UUID serviceId);
}
