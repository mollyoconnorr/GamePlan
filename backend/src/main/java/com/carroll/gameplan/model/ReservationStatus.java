package com.carroll.gameplan.model;

/**
 * Represents the possible statuses of a reservation in the system.
 * <p>
 * - ACTIVE: The reservation is currently active and upcoming.
 * - CANCELLED: The reservation was cancelled by the user or system.
 * - COMPLETED: The reservation has been fulfilled and is in the past.
 * </p>
 */
public enum ReservationStatus {
    /**
     * Reservation is currently active
     */
    ACTIVE,

    /**
     * Reservation has been cancelled
     */
    CANCELLED,

    /**
     * Reservation has been completed
     */
    COMPLETED
}
