package com.carroll.gameplan.dto;

import java.util.List;

public class EquipmentWithReservationsDTO {

    private Long id;
    private String name;
    private List<EquipmentAttributeDTO> attributes;
    private List<ReservationDTO> reservations;

    public EquipmentWithReservationsDTO(Long id, String name,
                                        List<EquipmentAttributeDTO> attributes,
                                        List<ReservationDTO> reservations) {
        this.id = id;
        this.name = name;
        this.attributes = attributes;
        this.reservations = reservations;
    }

    // getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public List<EquipmentAttributeDTO> getAttributes() { return attributes; }
    public List<ReservationDTO> getReservations() { return reservations; }
}