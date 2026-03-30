package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Notification;
import com.carroll.gameplan.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserAndReadFalse(User user);
}
