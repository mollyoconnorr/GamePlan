package com.carroll.gameplan.dto;

/**
 * Data Transfer Object (DTO) for creating or updating a reservation.
 * <p>
 * This class is used to receive reservation request data from the frontend.
 * The start and end times are represented as strings, typically in ISO-8601 format.
 * </p>
 */
public class ReservationRequest {

    /**
     * The ID of the equipment to reserve.
     */
    private Long equipmentId;

    /**
     * The start datetime of the reservation, as a string (ISO-8601 format).
     */
    private String start;

    /**
     * The end datetime of the reservation, as a string (ISO-8601 format).
     */
    private String end;

    /**
     * Gets the equipment ID.
     *
     * @return The ID of the equipment to reserve.
     */
    public Long getEquipmentId() {
        return equipmentId;
    }

    /**
     * Sets the equipment ID.
     *
     * @param equipmentId The ID of the equipment to reserve.
     */
    public void setEquipmentId(Long equipmentId) {
        this.equipmentId = equipmentId;
    }

    /**
     * Gets the start datetime of the reservation.
     *
     * @return The start datetime as a string.
     */
    public String getStart() {
        return start;
    }

    /**
     * Sets the start datetime of the reservation.
     *
     * @param start The start datetime as a string (ISO-8601 format).
     */
    public void setStart(String start) {
        this.start = start;
    }

    /**
     * Gets the end datetime of the reservation.
     *
     * @return The end datetime as a string.
     */
    public String getEnd() {
        return end;
    }

    /**
     * Sets the end datetime of the reservation.
     *
     * @param end The end datetime as a string (ISO-8601 format).
     */
    public void setEnd(String end) {
        this.end = end;
    }
}
