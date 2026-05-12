package com.driftguard.replay;

import com.driftguard.common.BadRequestException;
import com.driftguard.common.ConflictException;
import com.driftguard.common.DriftType;
import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.recorder.Baseline;
import com.driftguard.recorder.BaselineRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class ReplayServiceImpl implements ReplayService {

    private final ReplayPersistenceService persistenceService;
    private final ReplayJobRunner replayJobRunner;
    private final ReplaySessionRepository sessionRepository;
    private final ReplayResultRepository resultRepository;
    private final BaselineRepository baselineRepository;
    private final BaselinePromotionRepository promotionRepository;

    public ReplayServiceImpl(
            ReplayPersistenceService persistenceService,
            ReplayJobRunner replayJobRunner,
            ReplaySessionRepository sessionRepository,
            ReplayResultRepository resultRepository,
            BaselineRepository baselineRepository,
            BaselinePromotionRepository promotionRepository
    ) {
        this.persistenceService = persistenceService;
        this.replayJobRunner = replayJobRunner;
        this.sessionRepository = sessionRepository;
        this.resultRepository = resultRepository;
        this.baselineRepository = baselineRepository;
        this.promotionRepository = promotionRepository;
    }

    @Override
    public ReplaySessionResponse trigger(TriggerReplayRequest request) {
        validateHttpUrl(request.stagingUrl());
        ReplaySessionResponse session = persistenceService.createSession(
                request.serviceId(), request.stagingUrl().trim());
        replayJobRunner.run(session.id());
        return session;
    }

    @Override
    public ReplaySessionResponse triggerBaseline(TriggerBaselineReplayRequest request) {
        validateHttpUrl(request.stagingUrl());
        Baseline baseline = baselineRepository.findById(request.baselineId())
                .orElseThrow(() -> new ResourceNotFoundException("Baseline not found: " + request.baselineId()));
        if (!baseline.getService().getId().equals(request.serviceId())) {
            throw new ResourceNotFoundException("Baseline not found for service: " + request.serviceId());
        }
        ReplaySessionResponse session = persistenceService.createSession(
                request.serviceId(), request.stagingUrl().trim());
        replayJobRunner.runFocused(session.id(), List.of(request.baselineId()));
        return session;
    }

    @Override
    @Transactional(readOnly = true)
    public ReplaySessionResponse getSession(UUID sessionId) {
        return ReplaySessionResponse.fromEntity(sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Replay session not found: " + sessionId)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReplayResultResponse> listResults(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new ResourceNotFoundException("Replay session not found: " + sessionId);
        }
        return resultRepository.findBySession_Id(sessionId).stream()
                .map(ReplayResultResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReplayResultResponse getResult(UUID sessionId, UUID resultId) {
        ReplayResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Replay result not found: " + resultId));
        if (!result.getSession().getId().equals(sessionId)) {
            throw new ResourceNotFoundException("Replay result not found for session: " + sessionId);
        }
        return ReplayResultResponse.fromEntity(result);
    }

    @Override
    @Transactional
    public ReplayResultResponse updateTriage(UUID sessionId, UUID resultId, UpdateTriageRequest request) {
        ReplayResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Replay result not found: " + resultId));
        if (!result.getSession().getId().equals(sessionId)) {
            throw new ResourceNotFoundException("Replay result not found for session: " + sessionId);
        }
        result.updateTriage(request.status(), request.note());
        return ReplayResultResponse.fromEntity(resultRepository.saveAndFlush(result));
    }

    @Override
    @Transactional
    public BaselinePromotionResponse promote(UUID sessionId, PromoteBaselineRequest request) {
        ReplaySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Replay session not found: " + sessionId));
        List<ReplayResult> results = resultRepository.findBySession_Id(sessionId);
        if (session.getStatus() != ReplayStatus.DONE) {
            throw new BadRequestException("Only completed replay sessions can be promoted");
        }
        if (results.isEmpty()) {
            throw new BadRequestException("Replay session has no results to promote");
        }
        if (promotionRepository.existsBySession_Id(sessionId)) {
            throw new ConflictException("Replay session has already been promoted");
        }
        if (!request.force() && !isPromotable(results)) {
            throw new BadRequestException("Replay is not ready for promotion. Triage open or blocking drift first, or use force.");
        }

        List<Baseline> promoted = results.stream()
                .map(result -> new Baseline(
                        session.getService(),
                        result.getBaseline().getMethod(),
                        result.getBaseline().getPath(),
                        result.getBaseline().getRequestHeaders(),
                        result.getBaseline().getRequestBody(),
                        result.getReplayedStatus(),
                        result.getReplayedHeaders(),
                        result.getReplayedBody(),
                        result.getReplayedResponseTimeMs()
                ))
                .toList();
        baselineRepository.saveAllAndFlush(promoted);

        BaselinePromotion promotion = promotionRepository.saveAndFlush(new BaselinePromotion(
                session,
                session.getService(),
                promotedBy(request),
                note(request),
                promoted.size(),
                request.force()
        ));
        return BaselinePromotionResponse.fromEntity(promotion);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BaselinePromotionResponse> listPromotions(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new ResourceNotFoundException("Replay session not found: " + sessionId);
        }
        return promotionRepository.findBySession_IdOrderByPromotedAtDesc(sessionId).stream()
                .map(BaselinePromotionResponse::fromEntity)
                .toList();
    }

    private boolean isPromotable(List<ReplayResult> results) {
        return results.stream().noneMatch(result ->
                result.getTriageStatus() == TriageStatus.BLOCKING
                        || (result.getDriftType() != DriftType.NONE && result.getTriageStatus() == TriageStatus.OPEN)
        );
    }

    private String promotedBy(PromoteBaselineRequest request) {
        return request.promotedBy() == null || request.promotedBy().isBlank()
                ? "demo@driftguard.local"
                : request.promotedBy().trim();
    }

    private String note(PromoteBaselineRequest request) {
        return request.note() == null || request.note().isBlank() ? null : request.note().trim();
    }

    private void validateHttpUrl(String value) {
        try {
            URI uri = new URI(value.trim());
            String scheme = uri.getScheme();
            if (scheme == null || uri.getHost() == null
                    || (!scheme.equals("http") && !scheme.equals("https"))) {
                throw new BadRequestException("stagingUrl must be an absolute HTTP or HTTPS URL");
            }
        } catch (URISyntaxException ex) {
            throw new BadRequestException("stagingUrl must be a valid URL");
        }
    }
}
