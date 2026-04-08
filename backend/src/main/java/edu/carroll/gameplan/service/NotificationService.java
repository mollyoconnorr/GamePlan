package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service responsible for creating and delivering notifications to users.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

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
    }

    /**
     * Fetches unread notifications for the user and marks them as read.
     *
     * @param user target user
     * @return list of notifications that were unread
     */
    @Transactional
    public List<Notification> fetchUnreadAndMarkRead(User user) {
        List<Notification> unread = notificationRepository.findByUserAndReadFalse(user);
        if (!unread.isEmpty()) {
            unread.forEach(notification -> notification.setRead(true));
            notificationRepository.saveAll(unread);
        }
        return unread;
    }
}
