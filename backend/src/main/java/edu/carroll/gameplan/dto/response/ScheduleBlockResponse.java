package edu.carroll.gameplan.dto.response;

import java.time.LocalDateTime;

/**
 * API payload for a persisted schedule block.
 */
public record ScheduleBlockResponse(
        Long id,
        String start,
        String end,
        String reason,
        String blockType,
        Integer canceledReservations
) {
    /**
     * Creates the schedule block response DTO returned by admin block endpoints.
     */
    public ScheduleBlockResponse(Long id, LocalDateTime start, LocalDateTime end, String reason) {
        this(id, start.toString(), end.toString(), reason, null, null);
    }
}
