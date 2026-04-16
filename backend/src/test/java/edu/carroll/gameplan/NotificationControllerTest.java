package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.NotificationController;
import edu.carroll.gameplan.dto.response.NotificationCountResponse;
import edu.carroll.gameplan.dto.response.NotificationResponse;
import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.NotificationService;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationControllerTest {

    private NotificationService notificationService;
    private UserService userService;
    private NotificationController controller;
    private OAuth2AuthenticationToken authentication;
    private User currentUser;

    @BeforeEach
    void setUp() {
        notificationService = mock(NotificationService.class);
        userService = mock(UserService.class);
        controller = new NotificationController(notificationService, userService);
        authentication = mock(OAuth2AuthenticationToken.class);
        currentUser = new User();
        currentUser.setId(42L);

        when(userService.resolveCurrentUser(authentication)).thenReturn(currentUser);
    }

    @Test
    void getNotificationsMapsUnreadNotifications() {
        Notification notification = new Notification();
        ReflectionTestUtils.setField(notification, "id", 5L);
        notification.setMessage("Reservation cancelled");
        ReflectionTestUtils.setField(notification, "createdAt", LocalDateTime.of(2026, 4, 1, 10, 30));
        when(notificationService.fetchUnread(currentUser)).thenReturn(List.of(notification));

        List<NotificationResponse> actual = controller.getNotifications(authentication);

        assertEquals(1, actual.size());
        assertEquals(5L, actual.get(0).id());
        assertEquals("Reservation cancelled", actual.get(0).message());
        verify(userService).resolveCurrentUser(authentication);
        verify(notificationService).fetchUnread(currentUser);
    }

    @Test
    void getUnreadCountReturnsServiceCount() {
        when(notificationService.countUnread(currentUser)).thenReturn(3L);

        NotificationCountResponse actual = controller.getUnreadCount(authentication);

        assertEquals(3L, actual.unreadCount());
        verify(userService).resolveCurrentUser(authentication);
        verify(notificationService).countUnread(currentUser);
    }

    @Test
    void markReadDelegatesAndReturnsNoContent() {
        ResponseEntity<Void> response = controller.markRead(9L, authentication);

        assertEquals(HttpStatusCode.valueOf(204), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(notificationService).markAsRead(currentUser, 9L);
    }
}
