package com.driftguard.replay;

import java.time.Instant;
import java.util.UUID;

public record BaselinePromotionResponse(
        UUID id,
        UUID sessionId,
        UUID serviceId,
        String promotedBy,
        String note,
        int promotedCount,
        boolean forced,
        Instant promotedAt
) {
    static BaselinePromotionResponse fromEntity(BaselinePromotion promotion) {
        return new BaselinePromotionResponse(
                promotion.getId(),
                promotion.getSession().getId(),
                promotion.getService().getId(),
                promotion.getPromotedBy(),
                promotion.getNote(),
                promotion.getPromotedCount(),
                promotion.isForced(),
                promotion.getPromotedAt()
        );
    }
}
