package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a reservation.
 * <p>
 * Contains the reservation ID, start time, and end time as ISO-formatted strings.
 * Used for sending reservation details to clients.
 * </p>
 */
public class ReservationDTO {

    /**
     * Unique identifier of the reservation.
     */
    private final Long id;

    /**
     * Reservation start time as a string (ISO format).
     */
    private final String start;

    /**
     * Reservation end time as a string (ISO format).
     */
    private final String end;

    /**
     * Constructor to create a ReservationDTO from LocalDateTime values.
     *
     * @param id    Unique reservation ID
     * @param start Reservation start time
     * @param end   Reservation end time
     */
    public ReservationDTO(Long id, LocalDateTime start, LocalDateTime end) {
        this.id = id;
        this.start = start.toString();
        this.end = end.toString();
    }

    // ===== Getters =====

    /**
     * Gets the reservation ID.
     *
     * @return reservation ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Gets the reservation start time as a string.
     *
     * @return start time
     */
    public String getStart() {
        return start;
    }

    /**
     * Gets the reservation end time as a string.
     *
     * @return end time
     */
    public String getEnd() {
        return end;
    }
}