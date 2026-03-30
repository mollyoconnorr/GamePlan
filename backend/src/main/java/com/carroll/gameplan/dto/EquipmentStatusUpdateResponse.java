package com.carroll.gameplan.dto;

/**
 * Response payload returned when an equipment status update occurs.
 */
public class EquipmentStatusUpdateResponse {

    private final EquipmentDTO equipment;
    private final int canceledReservations;

    public EquipmentStatusUpdateResponse(EquipmentDTO equipment, int canceledReservations) {
        this.equipment = equipment;
        this.canceledReservations = canceledReservations;
    }

    public EquipmentDTO getEquipment() {
        return equipment;
    }

    public int getCanceledReservations() {
        return canceledReservations;
    }
}
