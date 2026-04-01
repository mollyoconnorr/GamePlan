package com.carroll.gameplan.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Represents a notification delivered to a user.
 */
public record NotificationResponse(Long id, String message, String createdAt) {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a");

    public NotificationResponse(Long id, String message, LocalDateTime createdAt) {
        this(id, message, createdAt.format(FORMATTER));
    }

    /**
     * Gets the identifier for the notification.
     *
     * @return notification ID
     */
    @Override
    public Long id() {
        return id;
    }

    /**
     * Gets the message body presented to the user.
     *
     * @return notification message
     */
    @Override
    public String message() {
        return message;
    }

    /**
     * Gets the formatted timestamp for when the notification was created.
     *
     * @return formatted creation timestamp
     */
    @Override
    public String createdAt() {
        return createdAt;
    }
}
