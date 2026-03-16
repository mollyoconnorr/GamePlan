package com.carroll.gameplan.model;

import jakarta.persistence.*;

import java.util.List;

/**
 * Represents a piece of equipment that can be reserved by users.
 * <p>
 * Stores information such as the equipment name, status,
 * and the type of equipment it belongs to.
 * </p>
 */
@Entity
public class Equipment {

    /**
     * Primary key for the equipment entity.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Current status of the equipment (available, reserved, etc.).
     */
    @Enumerated(EnumType.STRING)
    private EquipmentStatus status;

    /**
     * Name of the equipment. Cannot be null.
     */
    @Column(nullable = false)
    private String name;

    /**
     * The type/category of this equipment. Cannot be null.
     */
    @ManyToOne
    @JoinColumn(name = "equipment_type_id", nullable = false)
    private EquipmentType equipmentType;

    /**
     * List of reservations associated with this equipment.
     */
    @OneToMany(mappedBy = "equipment")
    private List<Reservation> reservations;

    /**
     * Optional attributes for equipment (ex: size, color, etc.).
     */
    @OneToMany(mappedBy = "equipment", cascade = CascadeType.ALL)
    private List<EquipmentAttribute> attributes;

    /**
     * Default constructor.
     */
    public Equipment() {}

    // ===== Getters & Setters =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public EquipmentStatus getStatus() {
        return status;
    }

    public void setStatus(EquipmentStatus status) {
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public EquipmentType getEquipmentType() {
        return equipmentType;
    }

    public void setEquipmentType(EquipmentType equipmentType) {
        this.equipmentType = equipmentType;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }

    public List<EquipmentAttribute> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<EquipmentAttribute> attributes) {
        this.attributes = attributes;
    }
}