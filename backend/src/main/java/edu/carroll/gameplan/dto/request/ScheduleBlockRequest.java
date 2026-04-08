package edu.carroll.gameplan.dto.request;

import java.time.Instant;

/**
 * Payload for creating a global schedule block.
 */
public class ScheduleBlockRequest {

    private Instant start;
    private Instant end;
    private String reason;

    public Instant getStart() {
        return start;
    }

    public void setStart(Instant start) {
        this.start = start;
    }

    public Instant getEnd() {
        return end;
    }

    public void setEnd(Instant end) {
        this.end = end;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
