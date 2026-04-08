package edu.carroll.gameplan.model;

/**
 * Represents the lifecycle state for a schedule block.
 */
public enum ScheduleBlockStatus {
    /**
     * Block is active and should prevent reservations in its time range.
     */
    ACTIVE,

    /**
     * Block has been removed and should no longer be enforced.
     */
    CANCELLED
}
