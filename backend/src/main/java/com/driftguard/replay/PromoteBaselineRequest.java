package com.driftguard.replay;

public record PromoteBaselineRequest(
        boolean force,
        String promotedBy,
        String note
) {
}
