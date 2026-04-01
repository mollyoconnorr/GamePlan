package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a reservation.
 * <p>
 * Contains the reservation ID, start time, and end time as ISO-formatted strings.
 * Used for sending reservation details to clients.
 * </p>
 *
 * @param id    Unique identifier of the reservation.
 * @param start Reservation start time as a string (ISO format).
 * @param end   Reservation end time as a string (ISO format).
 */
public record ReservationDTO(Long id, String start, String end) {

    /**
     * Constructor to create a ReservationDTO from LocalDateTime values.
     *
     * @param id    Unique reservation ID
     * @param start Reservation start time
     * @param end   Reservation end time
     */
    public ReservationDTO(Long id, LocalDateTime start, LocalDateTime end) {
        this(id, start.toString(), end.toString());
    }

    // ===== Getters =====

    /**
     * Gets the reservation ID.
     *
     * @return reservation ID
     */
    @Override
    public Long id() {
        return id;
    }

    /**
     * Gets the reservation start time as a string.
     *
     * @return start time
     */
    @Override
    public String start() {
        return start;
    }

    /**
     * Gets the reservation end time as a string.
     *
     * @return end time
     */
    @Override
    public String end() {
        return end;
    }
}
