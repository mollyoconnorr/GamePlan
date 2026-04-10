package edu.carroll.gameplan.repository;

import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data repository for persisting and querying {@link Notification} entities.
 */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Finds unread notifications for a specific user.
     *
     * @param user target user
     * @return list of unread notifications
     */
    List<Notification> findByUserAndReadFalse(User user);

    long countByUserAndReadFalse(User user);
}
