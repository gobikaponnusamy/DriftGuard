package com.driftguard.diff;

public record DiffChange(
        String path,
        String type,
        Object from,
        Object to
) {
}
