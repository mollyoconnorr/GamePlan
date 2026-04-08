package edu.carroll.gameplan.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Simple notification entity sent to users when their reservation is impacted.
 */
@Entity
public class Notification {

    /** Primary key for the notification. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User receiving the notification. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** Message delivered to the user. */
    @Column(nullable = false, length = 512)
    private String message;

    /** Timestamp when the notification was created. */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** Indicates whether the notification has been read. */
    @Column(name = "is_read", nullable = false)
    private boolean read;

    public Notification() {
        this.read = false;
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    /**
     * Gets the notification ID.
     *
     * @return notification ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Gets the user who receives the notification.
     *
     * @return user entity
     */
    public User getUser() {
        return user;
    }

    /**
     * Sets the user who receives the notification.
     *
     * @param user user entity
     */
    public void setUser(User user) {
        this.user = user;
    }

    /**
     * Gets the notification message.
     *
     * @return message text
     */
    public String getMessage() {
        return message;
    }

    /**
     * Sets the notification message.
     *
     * @param message message text
     */
    public void setMessage(String message) {
        this.message = message;
    }

    /**
     * Gets the creation timestamp.
     *
     * @return creation time
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Indicates whether the notification has been read.
     *
     * @return read flag
     */
    public boolean isRead() {
        return read;
    }

    /**
     * Marks the notification as read or unread.
     *
     * @param read read flag
     */
    public void setRead(boolean read) {
        this.read = read;
    }
}
