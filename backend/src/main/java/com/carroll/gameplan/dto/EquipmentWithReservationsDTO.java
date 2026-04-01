package com.carroll.gameplan.dto;

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

    /**
     * Constructor to create an EquipmentWithReservationsDTO.
     *
     * @param id           Unique identifier of the equipment
     * @param name         Name of the equipment
     * @param attributes   List of attributes
     * @param reservations List of reservations
     */
    public EquipmentWithReservationsDTO {
    }

    // ===== Getters =====

    /**
     * Gets the equipment ID.
     *
     * @return equipment ID
     */
    @Override
    public Long id() {
        return id;
    }

    /**
     * Gets the equipment name.
     *
     * @return equipment name
     */
    @Override
    public String name() {
        return name;
    }

    /**
     * Gets the list of attributes for this equipment.
     *
     * @return list of attributes
     */
    @Override
    public List<EquipmentAttributeDTO> attributes() {
        return attributes;
    }

    /**
     * Gets the list of reservations for this equipment.
     *
     * @return list of reservations
     */
    @Override
    public List<ReservationDTO> reservations() {
        return reservations;
    }
}