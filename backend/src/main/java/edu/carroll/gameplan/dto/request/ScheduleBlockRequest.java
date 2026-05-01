package edu.carroll.gameplan.dto.request;

import java.time.Instant;

/**
 * Payload for creating a global schedule block.
 */
public class ScheduleBlockRequest {

    private Instant start;
    private Instant end;
    private String reason;
    private String blockType;

    /**
     * Returns the Start.
     *
     * @return the current value
     */
    public Instant getStart() {
        return start;
    }

    /**
     * Sets the Start.
     *
     * @param value the new value
     */
    public void setStart(Instant start) {
        this.start = start;
    }

    /**
     * Returns the End.
     *
     * @return the current value
     */
    public Instant getEnd() {
        return end;
    }

    /**
     * Sets the End.
     *
     * @param value the new value
     */
    public void setEnd(Instant end) {
        this.end = end;
    }

    /**
     * Returns the Reason.
     *
     * @return the current value
     */
    public String getReason() {
        return reason;
    }

    /**
     * Sets the Reason.
     *
     * @param value the new value
     */
    public void setReason(String reason) {
        this.reason = reason;
    }

    /**
     * Returns the BlockType.
     *
     * @return the current value
     */
    public String getBlockType() {
        return blockType;
    }

    /**
     * Sets the BlockType.
     *
     * @param value the new value
     */
    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }
}
