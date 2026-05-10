package com.driftguard.replay;

import com.driftguard.common.DriftType;
import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.recorder.Baseline;
import com.driftguard.recorder.BaselineRepository;
import com.driftguard.redaction.RedactedHttpExchange;
import com.driftguard.redaction.RedactionRuleService;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class ReplayPersistenceService {

    private final ReplaySessionRepository sessionRepository;
    private final ReplayResultRepository resultRepository;
    private final BaselineRepository baselineRepository;
    private final ServiceRepository serviceRepository;
    private final RedactionRuleService redactionRuleService;

    public ReplayPersistenceService(
            ReplaySessionRepository sessionRepository,
            ReplayResultRepository resultRepository,
            BaselineRepository baselineRepository,
            ServiceRepository serviceRepository,
            RedactionRuleService redactionRuleService
    ) {
        this.sessionRepository = sessionRepository;
        this.resultRepository = resultRepository;
        this.baselineRepository = baselineRepository;
        this.serviceRepository = serviceRepository;
        this.redactionRuleService = redactionRuleService;
    }

    @Transactional
    public ReplaySessionResponse createSession(UUID serviceId, String stagingUrl) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        ReplaySession session = sessionRepository.saveAndFlush(new ReplaySession(service, stagingUrl));
        return ReplaySessionResponse.fromEntity(session);
    }

    @Transactional
    public ReplayWork start(UUID sessionId) {
        ReplaySession session = findSession(sessionId);
        List<Baseline> baselines = baselineRepository
                .findByService_IdOrderByCapturedAtAsc(session.getService().getId());
        session.markRunning(baselines.size());
        return new ReplayWork(session.getId(), session.getService().getId(),
                session.getStagingUrl(), baselines);
    }

    @Transactional
    public ReplayResult saveResult(
            UUID sessionId,
            UUID baselineId,
            ReplayedHttpResponse replayed,
            DriftType driftType,
            String driftSummary,
            Map<String, Object> diffJson
    ) {
        ReplaySession session = findSession(sessionId);
        Baseline baseline = baselineRepository.findById(baselineId)
                .orElseThrow(() -> new ResourceNotFoundException("Baseline not found: " + baselineId));
        RedactedHttpExchange redacted = redactionRuleService.redactExchange(
                session.getService().getId(),
                Map.of(),
                null,
                replayed.headers(),
                replayed.body()
        );
        return resultRepository.saveAndFlush(new ReplayResult(
                session,
                baseline,
                replayed.status(),
                redacted.responseHeaders(),
                redacted.responseBody(),
                replayed.responseTimeMs(),
                driftType,
                driftSummary,
                diffJson
        ));
    }

    @Transactional
    public void complete(UUID sessionId, int driftedCount) {
        findSession(sessionId).markDone(driftedCount);
    }

    @Transactional
    public void fail(UUID sessionId) {
        findSession(sessionId).markFailed();
    }

    private ReplaySession findSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Replay session not found: " + sessionId));
    }
}
