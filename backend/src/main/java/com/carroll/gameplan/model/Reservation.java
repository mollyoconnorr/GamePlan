package com.carroll.gameplan.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Represents a reservation made by a user for a specific piece of equipment.
 * Each reservation has a start and end datetime, a status, and timestamps for creation and updates.
 * A reservation is associated with exactly one {@link User} and one {@link Equipment}.
 */
@Entity
public class Reservation {

    /**
     * The primary key of the reservation.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The start date and time of the reservation.
     */
    private LocalDateTime startDatetime;

    /**
     * The end date and time of the reservation.
     */
    private LocalDateTime endDatetime;

    /**
     * The status of the reservation (e.g., ACTIVE, CANCELLED, COMPLETED).
     */
    @Enumerated(EnumType.STRING)
    private ReservationStatus status;

    /**
     * The timestamp when the reservation was created.
     * Automatically set by {@link #onCreate()}.
     */
    private LocalDateTime createdAt;

    /**
     * The timestamp when the reservation was last updated.
     * Automatically set by {@link #onUpdate()}.
     */
    private LocalDateTime updatedAt;

    /**
     * The user who made the reservation.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * The equipment that is reserved.
     */
    @ManyToOne
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    /**
     * Default constructor required by JPA.
     */
    public Reservation() {
    }

    /**
     * Automatically sets the creation timestamp before persisting.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Automatically sets the update timestamp before updating.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ===== Getters and Setters =====

    /**
     * Gets the reservation ID.
     *
     * @return the reservation ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the reservation ID.
     *
     * @param id the reservation ID
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Gets the start datetime of the reservation.
     *
     * @return the start datetime
     */
    public LocalDateTime getStartDatetime() {
        return startDatetime;
    }

    /**
     * Sets the start datetime of the reservation.
     *
     * @param startDatetime the start datetime
     */
    public void setStartDatetime(LocalDateTime startDatetime) {
        this.startDatetime = startDatetime;
    }

    /**
     * Gets the end datetime of the reservation.
     *
     * @return the end datetime
     */
    public LocalDateTime getEndDatetime() {
        return endDatetime;
    }

    /**
     * Sets the end datetime of the reservation.
     *
     * @param endDatetime the end datetime
     */
    public void setEndDatetime(LocalDateTime endDatetime) {
        this.endDatetime = endDatetime;
    }

    /**
     * Gets the reservation status.
     *
     * @return the reservation status
     */
    public ReservationStatus getStatus() {
        return status;
    }

    /**
     * Sets the reservation status.
     *
     * @param status the reservation status
     */
    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    /**
     * Gets the creation timestamp.
     *
     * @return the creation timestamp
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Sets the creation timestamp.
     *
     * @param createdAt the creation timestamp
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Gets the last updated timestamp.
     *
     * @return the last updated timestamp
     */
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Sets the last updated timestamp.
     *
     * @param updatedAt the last updated timestamp
     */
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Gets the user who made the reservation.
     *
     * @return the user
     */
    public User getUser() {
        return user;
    }

    /**
     * Sets the user who made the reservation.
     *
     * @param user the user
     */
    public void setUser(User user) {
        this.user = user;
    }

    /**
     * Gets the reserved equipment.
     *
     * @return the equipment
     */
    public Equipment getEquipment() {
        return equipment;
    }

    /**
     * Sets the reserved equipment.
     *
     * @param equipment the equipment
     */
    public void setEquipment(Equipment equipment) {
        this.equipment = equipment;
    }
}
