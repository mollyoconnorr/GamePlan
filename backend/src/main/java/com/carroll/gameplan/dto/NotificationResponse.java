package com.carroll.gameplan.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Represents a notification delivered to a user.
 */
public class NotificationResponse {

    private final Long id;
    private final String message;
    private final String createdAt;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a");

    public NotificationResponse(Long id, String message, LocalDateTime createdAt) {
        this.id = id;
        this.message = message;
        this.createdAt = createdAt.format(FORMATTER);
    }

    public Long getId() {
        return id;
    }

    public String getMessage() {
        return message;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
