package com.carroll.gameplan.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer minTime;
    private Integer maxTime;
    private Integer stepMin;

    private Integer minResLength;
    private Integer maxResLength;
    private Integer defaultResLength;

    @Enumerated(EnumType.STRING)
    private EquipmentStatus status;

    @Column(nullable = false)
    private String name;

    @ManyToOne
    @JoinColumn(name = "equipment_type_id", nullable = false)
    private EquipmentType equipmentType;

    @OneToMany(mappedBy = "equipment")
    private List<Reservation> reservations;

    public Equipment() {}

    // getters
    public Long getId() {
        return id;
    }

    public Integer getMinTime() {
        return minTime;
    }

    public Integer getMaxTime() {
        return maxTime;
    }

    public Integer getStepMin() {
        return stepMin;
    }

    public Integer getMinResLength() {
        return minResLength;
    }

    public Integer getMaxResLength() {
        return maxResLength;
    }

    public Integer getDefaultResLength() {
        return defaultResLength;
    }

    public EquipmentStatus getStatus() {
        return status;
    }

    public String getName() {
        return name;
    }

    public EquipmentType getEquipmentType() {
        return equipmentType;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    // ===== Setters =====

    public void setId(Long id) {
        this.id = id;
    }

    public void setMinTime(Integer minTime) {
        this.minTime = minTime;
    }

    public void setMaxTime(Integer maxTime) {
        this.maxTime = maxTime;
    }

    public void setStepMin(Integer stepMin) {
        this.stepMin = stepMin;
    }

    public void setMinResLength(Integer minResLength) {
        this.minResLength = minResLength;
    }

    public void setMaxResLength(Integer maxResLength) {
        this.maxResLength = maxResLength;
    }

    public void setDefaultResLength(Integer defaultResLength) {
        this.defaultResLength = defaultResLength;
    }

    public void setStatus(EquipmentStatus status) {
        this.status = status;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEquipmentType(EquipmentType equipmentType) {
        this.equipmentType = equipmentType;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }
}
