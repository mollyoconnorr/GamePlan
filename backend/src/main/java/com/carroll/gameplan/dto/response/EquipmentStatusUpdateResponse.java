package com.carroll.gameplan.dto.response;

/**
 * Response payload returned when an equipment status update occurs.
 */
public record EquipmentStatusUpdateResponse(EquipmentDTO equipment, int canceledReservations) {

}
