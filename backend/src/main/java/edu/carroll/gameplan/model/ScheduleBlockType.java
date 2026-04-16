package edu.carroll.gameplan.model;

/**
 * Distinguishes a closed block from an open window override.
 */
public enum ScheduleBlockType {
    /**
     * Time range is unavailable for reservations.
     */
    BLOCK,

    /**
     * Time range is explicitly open and can override weekend closure rules.
     */
    OPEN
}
