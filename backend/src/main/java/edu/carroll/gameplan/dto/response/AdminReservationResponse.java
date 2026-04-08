package edu.carroll.gameplan.dto.response;

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
        this(id, equipmentName, start.toString(), end.toString(), athleteFirstName, athleteLastName, color);
    }
}
