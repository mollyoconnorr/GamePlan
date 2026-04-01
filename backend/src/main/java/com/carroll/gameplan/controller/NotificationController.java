package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.NotificationResponse;
import com.carroll.gameplan.model.Notification;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.service.NotificationService;
import com.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Provides the logged-in user with stored notifications such as reservation cancellations.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    public NotificationController(NotificationService notificationService,
                                  UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @GetMapping
    /**
     * Reads and clears the user's unread notifications.
     */
    public List<NotificationResponse> getNotifications(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        List<Notification> notifications = notificationService.fetchUnreadAndMarkRead(user);
        return notifications.stream()
                .map(n -> new NotificationResponse(n.getId(), n.getMessage(), n.getCreatedAt()))
                .toList();
    }
}
