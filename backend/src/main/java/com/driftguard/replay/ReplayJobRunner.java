package com.driftguard.replay;

import com.driftguard.common.DriftType;
import com.driftguard.diff.DiffEngine;
import com.driftguard.diff.DiffEngineResult;
import com.driftguard.ignore.IgnoreRuleService;
import com.driftguard.recorder.Baseline;
import com.driftguard.websocket.ReplayEventPublisher;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class ReplayJobRunner {

    private final ReplayPersistenceService persistenceService;
    private final ReplayHttpClient replayHttpClient;
    private final DiffEngine diffEngine;
    private final IgnoreRuleService ignoreRuleService;
    private final ReplayStateStore stateStore;
    private final ReplayEventPublisher eventPublisher;

    public ReplayJobRunner(
            ReplayPersistenceService persistenceService,
            ReplayHttpClient replayHttpClient,
            DiffEngine diffEngine,
            IgnoreRuleService ignoreRuleService,
            ReplayStateStore stateStore,
            ReplayEventPublisher eventPublisher
    ) {
        this.persistenceService = persistenceService;
        this.replayHttpClient = replayHttpClient;
        this.diffEngine = diffEngine;
        this.ignoreRuleService = ignoreRuleService;
        this.stateStore = stateStore;
        this.eventPublisher = eventPublisher;
    }

    @Async
    public void run(UUID sessionId) {
        runInternal(sessionId, null);
    }

    @Async
    public void runFocused(UUID sessionId, List<UUID> baselineIds) {
        runInternal(sessionId, baselineIds);
    }

    private void runInternal(UUID sessionId, List<UUID> baselineIds) {
        try {
            ReplayWork work = baselineIds == null
                    ? persistenceService.start(sessionId)
                    : persistenceService.start(sessionId, baselineIds);
            int total = work.baselines().size();
            int progress = 0;
            int driftedCount = 0;
            safeRunning(sessionId, total);
            List<String> ignoredPaths = ignoreRuleService.fieldPathsForService(work.serviceId());

            for (Baseline baseline : work.baselines()) {
                ReplayedHttpResponse replayed = replayHttpClient.replay(work.stagingUrl(), baseline, work.replayAuth());
                DiffEngineResult diff = diffEngine.compare(
                        baseline.getResponseStatus(),
                        baseline.getResponseBody(),
                        baseline.getResponseTimeMs(),
                        replayed.status(),
                        replayed.body(),
                        replayed.responseTimeMs(),
                        ignoredPaths
                );
                persistenceService.saveResult(sessionId, baseline.getId(), replayed,
                        diff.driftType(), diff.summary(), diff.toDiffJson());

                progress++;
                if (diff.driftType() != DriftType.NONE) {
                    driftedCount++;
                }
                safeProgress(sessionId, progress, total, driftedCount);
                safePublish(sessionId, ReplayProgressEvent.requestDone(
                        baseline.getId(), baseline.getPath(), diff.driftType(), progress, total));
            }

            persistenceService.complete(sessionId, driftedCount);
            safeCompleted(sessionId, total, driftedCount);
            safePublish(sessionId, ReplayProgressEvent.completed(total, driftedCount));
        } catch (Exception ex) {
            persistenceService.fail(sessionId);
            safeFailed(sessionId);
        }
    }

    private void safeRunning(UUID sessionId, int total) {
        try {
            stateStore.markRunning(sessionId, total);
        } catch (Exception ignored) {
        }
    }

    private void safeProgress(UUID sessionId, int progress, int total, int driftedCount) {
        try {
            stateStore.updateProgress(sessionId, progress, total, driftedCount);
        } catch (Exception ignored) {
        }
    }

    private void safeCompleted(UUID sessionId, int total, int driftedCount) {
        try {
            stateStore.markCompleted(sessionId, total, driftedCount);
        } catch (Exception ignored) {
        }
    }

    private void safeFailed(UUID sessionId) {
        try {
            stateStore.markFailed(sessionId);
        } catch (Exception ignored) {
        }
    }

    private void safePublish(UUID sessionId, ReplayProgressEvent event) {
        try {
            eventPublisher.publish(sessionId, event);
        } catch (Exception ignored) {
        }
    }
}
