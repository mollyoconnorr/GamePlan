package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Notification;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
/**
 * Unit tests for {@link NotificationService}, focusing on persistence and unread handling.
 */
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    /**
     * Ensures notifications are saved with the recipient and message.
     */
    void createNotificationPersistsMessage() {
        User recipient = new User();
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(recipient, "hello");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        assertThat(captor.getValue().getUser()).isEqualTo(recipient);
        assertThat(captor.getValue().getMessage()).isEqualTo("hello");
    }

    @Test
    /**
     * Verifies unread notifications are marked as read and flushed.
     */
    void fetchUnreadMarksMatchingNotificationsAsRead() {
        User user = new User();
        Notification unread = new Notification();
        unread.setRead(false);
        when(notificationRepository.findByUserAndReadFalse(user)).thenReturn(List.of(unread));

        List<Notification> result = notificationService.fetchUnreadAndMarkRead(user);

        assertThat(result).containsExactly(unread);
        assertThat(unread.isRead()).isTrue();
        ArgumentCaptor<List<Notification>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(listCaptor.capture());
        assertThat(listCaptor.getValue()).containsExactly(unread);
    }

    @Test
    /**
     * Confirms no save call happens when the user has no unread notifications.
     */
    void fetchUnreadSkipsSaveWhenNone() {
        User user = new User();
        when(notificationRepository.findByUserAndReadFalse(user)).thenReturn(List.of());

        List<Notification> result = notificationService.fetchUnreadAndMarkRead(user);

        assertThat(result).isEmpty();
        verify(notificationRepository).findByUserAndReadFalse(user);
        verify(notificationRepository, never()).saveAll(any());
    }
}
