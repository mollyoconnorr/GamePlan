package com.carroll.gameplan.dto.response;

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
}
