package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.NotificationResponse;
import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.NotificationService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /**
     * Reads and clears the user's unread notifications.
     */
    @GetMapping
    public List<NotificationResponse> getNotifications(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        List<Notification> notifications = notificationService.fetchUnreadAndMarkRead(user);
        return notifications.stream()
                .map(n -> new NotificationResponse(n.getId(), n.getMessage(), n.getCreatedAt()))
                .toList();
    }
}
