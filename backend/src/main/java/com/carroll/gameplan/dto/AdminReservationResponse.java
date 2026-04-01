package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

/**
 * DTO used by the admin-facing reservation endpoint.
 * <p>
 * Includes athlete metadata so admins can see who reserved each piece.
 * </p>
 */
public record AdminReservationResponse(Long id, String equipmentName, String start, String end, String athleteFirstName,
                                       String athleteLastName, String color) {

    public AdminReservationResponse(Long id,
                                    String equipmentName,
                                    LocalDateTime start,
                                    LocalDateTime end,
                                    String athleteFirstName,
                                    String athleteLastName,
                                    String color) {
        this(id,
                equipmentName,
                start.toString(),
                end.toString(),
                athleteFirstName,
                athleteLastName,
                color);
    }

    /**
     * Gets the reservation identifier.
     *
     * @return Reservation ID
     */
    @Override
    public Long id() {
        return id;
    }

    /**
     * Gets the name of the equipment reserved.
     *
     * @return Equipment name
     */
    @Override
    public String equipmentName() {
        return equipmentName;
    }

    /**
     * Gets the reservation start timestamp, formatted as a string.
     *
     * @return Start timestamp
     */
    @Override
    public String start() {
        return start;
    }

    /**
     * Gets the reservation end timestamp, formatted as a string.
     *
     * @return End timestamp
     */
    @Override
    public String end() {
        return end;
    }

    /**
     * Gets the athlete's first name.
     *
     * @return Athlete first name
     */
    @Override
    public String athleteFirstName() {
        return athleteFirstName;
    }

    /**
     * Gets the athlete's last name.
     *
     * @return Athlete last name
     */
    @Override
    public String athleteLastName() {
        return athleteLastName;
    }

    /**
     * Gets the display color associated with the reservation entry.
     *
     * @return Display color
     */
    @Override
    public String color() {
        return color;
    }
}
