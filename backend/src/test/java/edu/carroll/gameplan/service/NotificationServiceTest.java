package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link NotificationService}, focusing on persistence and unread handling.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private NotificationService notificationService;

    /**
     * Ensures notifications are saved with the recipient and message.
     */
    @Test
    void createNotificationPersistsMessage() {
        User recipient = new User();
        recipient.setRole(UserRole.ATHLETE);
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(recipient, "hello");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        assertThat(captor.getValue().getUser()).isEqualTo(recipient);
        assertThat(captor.getValue().getMessage()).isEqualTo("hello");
        verify(emailNotificationService).sendNotificationEmail(recipient, "hello");
    }

    @Test
    void createNotificationSkipsEmailForNonAthletes() {
        User recipient = new User();
        recipient.setRole(UserRole.ADMIN);
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(recipient, "hello");

        verify(emailNotificationService, never()).sendNotificationEmail(any(), any());
    }

    /**
     * Confirms no save call happens when the user has no unread notifications.
     */
    @Test
    void fetchUnreadReturnsUnmarkedNotifications() {
        User user = new User();
        Notification notification = new Notification();
        when(notificationRepository.findByUserAndReadFalse(user)).thenReturn(List.of(notification));

        List<Notification> result = notificationService.fetchUnread(user);

        assertThat(result).containsExactly(notification);
        verify(notificationRepository).findByUserAndReadFalse(user);
    }

    @Test
    void countUnreadDelegatesToRepository() {
        User user = new User();
        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(3L);

        long count = notificationService.countUnread(user);

        assertThat(count).isEqualTo(3L);
        verify(notificationRepository).countByUserAndReadFalse(user);
    }

    @Test
    void markAsReadUpdatesNotification() {
        User user = new User();
        user.setId(1L);
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setRead(false);
        when(notificationRepository.findById(any())).thenReturn(java.util.Optional.of(notification));

        notificationService.markAsRead(user, 2L);

        assertThat(notification.isRead()).isTrue();
        verify(notificationRepository).save(notification);
    }

    @Test
    void markAsReadRejectsWrongUser() {
        User owner = new User();
        owner.setId(1L);
        Notification notification = new Notification();
        notification.setUser(owner);
        notification.setRead(false);
        when(notificationRepository.findById(any())).thenReturn(java.util.Optional.of(notification));

        User other = new User();
        other.setId(99L);

        assertThatThrownBy(() -> notificationService.markAsRead(other, 2L))
                .isInstanceOf(AccessDeniedException.class);
    }
}
