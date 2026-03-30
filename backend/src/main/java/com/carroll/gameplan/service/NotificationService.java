package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Notification;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void createNotification(User user, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notificationRepository.save(notification);
    }

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
