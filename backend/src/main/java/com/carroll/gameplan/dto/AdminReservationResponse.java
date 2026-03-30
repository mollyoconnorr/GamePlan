package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

/**
 * DTO used by the admin-facing reservation endpoint.
 * <p>
 * Includes athlete metadata so admins can see who reserved each piece.
 * </p>
 */
public class AdminReservationResponse {

    private final Long id;
    private final String equipmentName;
    private final String start;
    private final String end;
    private final String athleteFirstName;
    private final String athleteLastName;
    private final String color;

    public AdminReservationResponse(Long id,
                                    String equipmentName,
                                    LocalDateTime start,
                                    LocalDateTime end,
                                    String athleteFirstName,
                                    String athleteLastName,
                                    String color) {
        this.id = id;
        this.equipmentName = equipmentName;
        this.start = start.toString();
        this.end = end.toString();
        this.athleteFirstName = athleteFirstName;
        this.athleteLastName = athleteLastName;
        this.color = color;
    }

    public Long getId() {
        return id;
    }

    public String getEquipmentName() {
        return equipmentName;
    }

    public String getStart() {
        return start;
    }

    public String getEnd() {
        return end;
    }

    public String getAthleteFirstName() {
        return athleteFirstName;
    }

    public String getAthleteLastName() {
        return athleteLastName;
    }

    public String getColor() {
        return color;
    }
}
