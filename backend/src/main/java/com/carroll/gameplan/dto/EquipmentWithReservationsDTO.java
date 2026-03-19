package com.carroll.gameplan.dto;

import java.util.List;

/**
 * Data Transfer Object representing a piece of equipment along with its reservations.
 * <p>
 * Contains basic equipment info (ID, name), a list of attributes, and a list of reservations.
 * Useful for displaying equipment details along with upcoming or existing reservations.
 * </p>
 */
public class EquipmentWithReservationsDTO {

    /**
     * Unique identifier for the equipment.
     */
    private final Long id;

    /**
     * Name of the equipment.
     */
    private final String name;

    /**
     * List of attributes associated with the equipment.
     */
    private final List<EquipmentAttributeDTO> attributes;

    /**
     * List of reservations for this equipment.
     */
    private final List<ReservationDTO> reservations;

    /**
     * Constructor to create an EquipmentWithReservationsDTO.
     *
     * @param id           Unique identifier of the equipment
     * @param name         Name of the equipment
     * @param attributes   List of attributes
     * @param reservations List of reservations
     */
    public EquipmentWithReservationsDTO(Long id, String name,
                                        List<EquipmentAttributeDTO> attributes,
                                        List<ReservationDTO> reservations) {
        this.id = id;
        this.name = name;
        this.attributes = attributes;
        this.reservations = reservations;
    }

    // ===== Getters =====

    /**
     * Gets the equipment ID.
     *
     * @return equipment ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Gets the equipment name.
     *
     * @return equipment name
     */
    public String getName() {
        return name;
    }

    /**
     * Gets the list of attributes for this equipment.
     *
     * @return list of attributes
     */
    public List<EquipmentAttributeDTO> getAttributes() {
        return attributes;
    }

    /**
     * Gets the list of reservations for this equipment.
     *
     * @return list of reservations
     */
    public List<ReservationDTO> getReservations() {
        return reservations;
    }
}