package com.carroll.gameplan.dto;

/**
 * Data Transfer Object (DTO) representing a reservation.
 * <p>
 * Used to transfer reservation data from the backend to the frontend.
 * </p>
 */
public class ReservationResponse {

    /**
     * The unique identifier of the reservation.
     */
    private Long id;

    /**
     * The name of the equipment reserved.
     */
    private String equipmentName;

    /**
     * The start datetime of the reservation as a string.
     */
    private String start;

    /**
     * The end datetime of the reservation as a string.
     */
    private String end;

    /**
     * Constructs a new ReservationResponse.
     *
     * @param id            The unique identifier of the reservation.
     * @param equipmentName The name of the reserved equipment.
     * @param start         The start datetime of the reservation.
     * @param end           The end datetime of the reservation.
     */
    public ReservationResponse(Long id, String equipmentName, String start, String end) {
        this.id = id;
        this.equipmentName = equipmentName;
        this.start = start;
        this.end = end;
    }

    /**
     * @return The unique identifier of the reservation.
     */
    public Long getId() {
        return id;
    }

    /**
     * @param id Sets the unique identifier of the reservation.
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * @return The name of the equipment reserved.
     */
    public String getEquipmentName() {
        return equipmentName;
    }

    /**
     * @param equipmentName Sets the name of the reserved equipment.
     */
    public void setEquipmentName(String equipmentName) {
        this.equipmentName = equipmentName;
    }

    /**
     * @return The start datetime of the reservation.
     */
    public String getStart() {
        return start;
    }

    /**
     * @param start Sets the start datetime of the reservation.
     */
    public void setStart(String start) {
        this.start = start;
    }

    /**
     * @return The end datetime of the reservation.
     */
    public String getEnd() {
        return end;
    }

    /**
     * @param end Sets the end datetime of the reservation.
     */
    public void setEnd(String end) {
        this.end = end;
    }
}
