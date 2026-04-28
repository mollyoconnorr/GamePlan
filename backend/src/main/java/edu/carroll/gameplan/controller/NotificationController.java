package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.NotificationCountResponse;
import edu.carroll.gameplan.dto.response.NotificationResponse;
import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.NotificationService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    /**
     * Exposes notification list, unread count, and read-state endpoints for the current user.
     */
    public NotificationController(NotificationService notificationService,
                                  UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    /**
     * Returns the user's unread notifications without mutating their state.
     */
    @GetMapping
    public List<NotificationResponse> getNotifications(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        List<Notification> notifications = notificationService.fetchUnread(user);
        return notifications.stream()
                .map(n -> new NotificationResponse(n.getId(), n.getMessage(), n.getCreatedAt()))
                .toList();
    }

    /**
     * Returns the UnreadCount.
     *
     * @return the current value
     */
    @GetMapping("/unread-count")
    public NotificationCountResponse getUnreadCount(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        return new NotificationCountResponse(notificationService.countUnread(user));
    }

    /**
     * Marks read through the backend API and updates local state.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id,
                                         OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        notificationService.markAsRead(user, id);
        return ResponseEntity.noContent().build();
    }
}
