package com.driftguard.diff;

import com.driftguard.common.DriftType;
import java.util.List;
import java.util.Map;

public record DiffEngineResult(
        DriftType driftType,
        String summary,
        List<DiffChange> drifts
) {
    public Map<String, Object> toDiffJson() {
        return Map.of("drifts", drifts);
    }
}
