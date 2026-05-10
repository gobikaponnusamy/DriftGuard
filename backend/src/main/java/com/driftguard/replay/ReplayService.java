package com.driftguard.replay;

import java.util.List;
import java.util.UUID;

public interface ReplayService {

    ReplaySessionResponse trigger(TriggerReplayRequest request);

    ReplaySessionResponse getSession(UUID sessionId);

    List<ReplayResultResponse> listResults(UUID sessionId);

    ReplayResultResponse getResult(UUID sessionId, UUID resultId);

    ReplayResultResponse updateTriage(UUID sessionId, UUID resultId, UpdateTriageRequest request);

    BaselinePromotionResponse promote(UUID sessionId, PromoteBaselineRequest request);

    List<BaselinePromotionResponse> listPromotions(UUID sessionId);
}
