package com.carroll.gameplan.dto.response;

import java.util.List;

/**
 * Data Transfer Object representing a piece of equipment along with its reservations.
 * <p>
 * Contains basic equipment info (ID, name), a list of attributes, and a list of reservations.
 * Useful for displaying equipment details along with upcoming or existing reservations.
 * </p>
 *
 * @param id           Unique identifier for the equipment.
 * @param name         Name of the equipment.
 * @param attributes   List of attributes associated with the equipment.
 * @param reservations List of reservations for this equipment.
 */
public record EquipmentWithReservationsDTO(Long id, String name, List<EquipmentAttributeDTO> attributes,
                                           List<ReservationDTO> reservations) {
}