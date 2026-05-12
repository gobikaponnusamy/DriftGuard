package com.driftguard.report;

import com.driftguard.common.DriftType;
import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.replay.ReplayResult;
import com.driftguard.replay.ReplayResultRepository;
import com.driftguard.replay.ReplaySession;
import com.driftguard.replay.ReplaySessionRepository;
import com.driftguard.service.ServiceRepository;
import com.driftguard.replay.ReplayStatus;
import com.driftguard.replay.TriageStatus;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportServiceImpl implements ReportService {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MMM d HH:mm").withZone(ZoneId.systemDefault());

    private final ServiceRepository serviceRepository;
    private final ReplaySessionRepository sessionRepository;
    private final ReplayResultRepository resultRepository;

    public ReportServiceImpl(
            ServiceRepository serviceRepository,
            ReplaySessionRepository sessionRepository,
            ReplayResultRepository resultRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.sessionRepository = sessionRepository;
        this.resultRepository = resultRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TimelinePointResponse> timeline(UUID serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
        return sessionRepository.findByService_IdOrderByTriggeredAtDesc(serviceId).stream()
                .sorted(Comparator.comparing(ReplaySession::getTriggeredAt))
                .map(this::toPoint)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReleaseReadinessResponse readiness(UUID serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
        ReplaySession latest = sessionRepository.findByService_IdOrderByTriggeredAtDesc(serviceId).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No replay sessions found for service: " + serviceId));
        List<ReplayResult> results = resultRepository.findBySession_Id(latest.getId());
        long breaking = count(results, DriftType.BREAKING);
        long warning = count(results, DriftType.WARNING);
        long performance = count(results, DriftType.PERFORMANCE);
        long open = countTriage(results, TriageStatus.OPEN);
        long accepted = countTriage(results, TriageStatus.ACCEPTED);
        long ignored = countTriage(results, TriageStatus.IGNORED);
        long fixed = countTriage(results, TriageStatus.FIXED);
        long blocking = countTriage(results, TriageStatus.BLOCKING);
        String decision = decision(latest, results);
        return new ReleaseReadinessResponse(
                serviceId,
                latest.getId(),
                latest.getStatus(),
                decision,
                message(decision, latest, results),
                latest.getTriggeredAt(),
                latest.getTotalRequests(),
                latest.getDriftedCount(),
                breaking,
                warning,
                performance,
                open,
                accepted,
                ignored,
                fixed,
                blocking
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<EndpointHistoryResponse> endpointHistory(UUID serviceId, String path) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
        return resultRepository
                .findBySession_Service_IdAndBaseline_PathOrderBySession_TriggeredAtAsc(serviceId, path)
                .stream()
                .map(result -> new EndpointHistoryResponse(
                        result.getSession().getId(),
                        result.getReplayedAt(),
                        result.getDriftType(),
                        result.getTriageStatus().name(),
                        result.getReplayedResponseTimeMs()
                ))
                .toList();
    }

    private TimelinePointResponse toPoint(ReplaySession session) {
        List<ReplayResult> results = resultRepository.findBySession_Id(session.getId());
        return new TimelinePointResponse(
                session.getId(),
                FORMATTER.format(session.getTriggeredAt()),
                count(results, DriftType.BREAKING),
                count(results, DriftType.WARNING),
                count(results, DriftType.PERFORMANCE)
        );
    }

    private long count(List<ReplayResult> results, DriftType driftType) {
        return results.stream().filter(result -> result.getDriftType() == driftType).count();
    }

    private long countTriage(List<ReplayResult> results, TriageStatus status) {
        return results.stream().filter(result -> result.getTriageStatus() == status).count();
    }

    private String decision(ReplaySession session, List<ReplayResult> results) {
        if (session.getStatus() == ReplayStatus.FAILED) {
            return "BLOCKED";
        }
        if (session.getStatus() != ReplayStatus.DONE) {
            return "PENDING";
        }
        if (session.getTotalRequests() == 0 || results.isEmpty()) {
            return "BLOCKED";
        }
        boolean hasBlocking = results.stream().anyMatch(result -> result.getTriageStatus() == TriageStatus.BLOCKING);
        boolean hasOpenBreaking = results.stream().anyMatch(result ->
                result.getDriftType() == DriftType.BREAKING && result.getTriageStatus() == TriageStatus.OPEN);
        boolean hasOpenDrift = results.stream().anyMatch(result ->
                result.getDriftType() != DriftType.NONE && result.getTriageStatus() == TriageStatus.OPEN);
        if (hasBlocking || hasOpenBreaking) {
            return "BLOCKED";
        }
        if (hasOpenDrift) {
            return "NEEDS_REVIEW";
        }
        return "READY";
    }

    private String message(String decision, ReplaySession session, List<ReplayResult> results) {
        if (session.getStatus() == ReplayStatus.DONE && (session.getTotalRequests() == 0 || results.isEmpty())) {
            return "No baseline requests were replayed. Capture or add baselines before testing staging.";
        }
        return switch (decision) {
            case "READY" -> "All drift has been triaged. Release can proceed.";
            case "NEEDS_REVIEW" -> "Non-breaking drift still needs review.";
            case "BLOCKED" -> "Release is blocked by breaking or explicitly blocking drift.";
            default -> "Replay is still running or waiting for results.";
        };
    }
}
