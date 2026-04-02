package com.carroll.gameplan.dto.response;

import java.time.LocalDateTime;

/**
 * API payload for a persisted schedule block.
 */
public record ScheduleBlockResponse(
        Long id,
        String start,
        String end,
        String reason,
        Integer canceledReservations
) {
    public ScheduleBlockResponse(Long id, LocalDateTime start, LocalDateTime end, String reason) {
        this(id, start.toString(), end.toString(), reason, null);
    }
}
