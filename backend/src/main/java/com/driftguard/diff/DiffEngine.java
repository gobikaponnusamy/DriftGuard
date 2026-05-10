package com.driftguard.diff;

import java.util.List;

public interface DiffEngine {

    DiffEngineResult compare(
            int baselineStatus,
            String baselineBody,
            long baselineResponseTimeMs,
            int replayedStatus,
            String replayedBody,
            long replayedResponseTimeMs,
            List<String> ignoredPaths
    );
}
