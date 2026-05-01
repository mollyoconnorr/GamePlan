package edu.carroll.gameplan.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * A trainer/admin-managed time range that blocks reservations globally.
 */
@Entity
public class ScheduleBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime startDatetime;

    @Column(nullable = false)
    private LocalDateTime endDatetime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleBlockStatus status;

    @Enumerated(EnumType.STRING)
    @Column
    private ScheduleBlockType blockType = ScheduleBlockType.BLOCK;

    @Column(length = 500)
    private String reason;

    @ManyToOne
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Creates a schedule block entity with default active status and timestamps managed by lifecycle callbacks.
     */
    public ScheduleBlock() {
    }

    /**
     * Initializes schedule block timestamps before first persistence.
     */
    @PrePersist
    protected void onCreate() {
        if (blockType == null) {
            blockType = ScheduleBlockType.BLOCK;
        }
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    /**
     * Updates the schedule block modification timestamp before each save.
     */
    @PreUpdate
    protected void onUpdate() {
        if (blockType == null) {
            blockType = ScheduleBlockType.BLOCK;
        }
        updatedAt = LocalDateTime.now();
    }

    /**
     * Returns the Id.
     *
     * @return the current value
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the Id.
     *
     * @param value the new value
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Returns the StartDatetime.
     *
     * @return the current value
     */
    public LocalDateTime getStartDatetime() {
        return startDatetime;
    }

    /**
     * Sets the StartDatetime.
     *
     * @param value the new value
     */
    public void setStartDatetime(LocalDateTime startDatetime) {
        this.startDatetime = startDatetime;
    }

    /**
     * Returns the EndDatetime.
     *
     * @return the current value
     */
    public LocalDateTime getEndDatetime() {
        return endDatetime;
    }

    /**
     * Sets the EndDatetime.
     *
     * @param value the new value
     */
    public void setEndDatetime(LocalDateTime endDatetime) {
        this.endDatetime = endDatetime;
    }

    /**
     * Returns the Status.
     *
     * @return the current value
     */
    public ScheduleBlockStatus getStatus() {
        return status;
    }

    /**
     * Sets the Status.
     *
     * @param value the new value
     */
    public void setStatus(ScheduleBlockStatus status) {
        this.status = status;
    }

    /**
     * Returns the BlockType.
     *
     * @return the current value
     */
    public ScheduleBlockType getBlockType() {
        return blockType;
    }

    /**
     * Sets the BlockType.
     *
     * @param value the new value
     */
    public void setBlockType(ScheduleBlockType blockType) {
        this.blockType = blockType;
    }

    /**
     * Returns the Reason.
     *
     * @return the current value
     */
    public String getReason() {
        return reason;
    }

    /**
     * Sets the Reason.
     *
     * @param value the new value
     */
    public void setReason(String reason) {
        this.reason = reason;
    }

    /**
     * Returns the CreatedBy.
     *
     * @return the current value
     */
    public User getCreatedBy() {
        return createdBy;
    }

    /**
     * Sets the CreatedBy.
     *
     * @param value the new value
     */
    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    /**
     * Returns the CreatedAt.
     *
     * @return the current value
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Sets the CreatedAt.
     *
     * @param value the new value
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Returns the UpdatedAt.
     *
     * @return the current value
     */
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Sets the UpdatedAt.
     *
     * @param value the new value
     */
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ScheduleBlock that)) {
            return false;
        }
        return Objects.equals(startDatetime, that.startDatetime)
                && Objects.equals(endDatetime, that.endDatetime)
                && Objects.equals(blockType, that.blockType)
                && Objects.equals(reason, that.reason)
                && Objects.equals(ownerKey(createdBy), ownerKey(that.createdBy));
    }

    @Override
    public int hashCode() {
        return Objects.hash(startDatetime, endDatetime, blockType, reason, ownerKey(createdBy));
    }

    private String ownerKey(User value) {
        if (value == null) {
            return null;
        }
        if (value.getOidcUserId() != null && !value.getOidcUserId().isBlank()) {
            return value.getOidcUserId().trim();
        }
        if (value.getEmail() != null && !value.getEmail().isBlank()) {
            return value.getEmail().trim().toLowerCase();
        }
        return null;
    }
}
