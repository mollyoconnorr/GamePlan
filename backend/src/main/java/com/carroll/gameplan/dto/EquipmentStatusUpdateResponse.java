package com.carroll.gameplan.dto;

/**
 * Response payload returned when an equipment status update occurs.
 */
public record EquipmentStatusUpdateResponse(EquipmentDTO equipment, int canceledReservations) {

    /**
     * Gets the updated equipment representation.
     *
     * @return equipment DTO
     */
    @Override
    public EquipmentDTO equipment() {
        return equipment;
    }

    /**
     * Gets the number of reservations canceled due to the status change.
     *
     * @return canceled reservation count
     */
    @Override
    public int canceledReservations() {
        return canceledReservations;
    }
}
