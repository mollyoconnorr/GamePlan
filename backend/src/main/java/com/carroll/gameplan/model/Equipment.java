package com.carroll.gameplan.model;

import jakarta.persistence.*;

import java.util.List;

/**
 * Represents a piece of equipment that can be reserved by users.
 * <p>
 * Stores information such as reservation time constraints, status,
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
     * Minimum allowable time (in minutes) for a reservation step.
     */
    private Integer minTime;

    /**
     * Maximum allowable time (in minutes) for a reservation step.
     */
    private Integer maxTime;

    /**
     * Increment step in minutes for time selection.
     */
    private Integer stepMin;

    /**
     * Minimum length of a reservation in minutes.
     */
    private Integer minResLength;

    /**
     * Maximum length of a reservation in minutes.
     */
    private Integer maxResLength;

    /**
     * Default reservation length in minutes.
     */
    private Integer defaultResLength;

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
     * Default constructor.
     */
    public Equipment() {
    }

    // ===== Getters =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getMinTime() {
        return minTime;
    }

    public void setMinTime(Integer minTime) {
        this.minTime = minTime;
    }

    public Integer getMaxTime() {
        return maxTime;
    }

    public void setMaxTime(Integer maxTime) {
        this.maxTime = maxTime;
    }

    public Integer getStepMin() {
        return stepMin;
    }

    public void setStepMin(Integer stepMin) {
        this.stepMin = stepMin;
    }

    public Integer getMinResLength() {
        return minResLength;
    }

    public void setMinResLength(Integer minResLength) {
        this.minResLength = minResLength;
    }

    public Integer getMaxResLength() {
        return maxResLength;
    }

    // ===== Setters =====

    public void setMaxResLength(Integer maxResLength) {
        this.maxResLength = maxResLength;
    }

    public Integer getDefaultResLength() {
        return defaultResLength;
    }

    public void setDefaultResLength(Integer defaultResLength) {
        this.defaultResLength = defaultResLength;
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

    public List<Reservation> getReservations() {
        return reservations;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }

    public EquipmentType getEquipmentType() {
        return equipmentType;
    }

    public void setEquipmentType(EquipmentType equipmentType) {
        this.equipmentType = equipmentType;
    }
}
