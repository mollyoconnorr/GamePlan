package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service responsible for creating and managing in-app notifications.
 *
 * <p>Notifications are used for reservation cancellations, maintenance events,
 * and other state changes that the UI should surface to the user.</p>
 */
@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    /**
     * Creates a notification service backed by the notification repository.
     */
    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Creates a new notification for the provided user with the supplied message.
     *
     * @param user    target user
     * @param message notification message
     */
    @Transactional
    public void createNotification(User user, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notificationRepository.save(notification);
        logger.debug("Created in-app notification for userId={}, role={}, email={}",
                user != null ? user.getId() : null,
                user != null ? user.getRole() : null,
                user != null ? user.getEmail() : null);
    }

    /**
     * Fetches unread notifications for the user without mutating their state.
     *
     * @param user target user
     * @return list of notifications that are currently unread
     */
    @Transactional
    public List<Notification> fetchUnread(User user) {
        return notificationRepository.findByUserAndReadFalse(user);
    }

    /**
     * Marks a specific notification as read when the owning user indicates they're done with it.
     */
    @Transactional
    public void markAsRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            logger.warn(
                    "Notification read denied: notificationId={}, actingUserId={}, ownerUserId={}",
                    notificationId,
                    user.getId(),
                    notification.getUser().getId()
            );
            throw new AccessDeniedException("Cannot mark another user's notification as read.");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
            logger.debug("Notification marked read: notificationId={}, userId={}", notificationId, user.getId());
        }
    }

    /**
     * Counts how many unread notifications the user currently has.
     */
    @Transactional(readOnly = true)
    public long countUnread(User user) {
        return notificationRepository.countByUserAndReadFalse(user);
    }
}
