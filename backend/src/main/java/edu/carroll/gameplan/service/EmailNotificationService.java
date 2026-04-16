package edu.carroll.gameplan.service;

import edu.carroll.gameplan.config.NotificationEmailProps;
import edu.carroll.gameplan.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final NotificationEmailProps notificationEmailProps;
    private final Environment environment;

    public EmailNotificationService(ObjectProvider<JavaMailSender> mailSenderProvider,
                                    NotificationEmailProps notificationEmailProps,
                                    Environment environment) {
        this.mailSenderProvider = mailSenderProvider;
        this.notificationEmailProps = notificationEmailProps;
        this.environment = environment;
    }

    public void sendNotificationEmail(User user, String notificationMessage) {
        boolean enabled = isEmailEnabled();
        if (!enabled || user == null) {
            logger.debug("Skipping email notification. enabled={}, userPresent={}",
                    enabled, user != null);
            return;
        }

        String userEmail = user.getEmail();
        if (userEmail == null || userEmail.isBlank()) {
            logger.debug("Skipping email notification because user has no email. userId={}", user.getId());
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            logger.warn("Email notifications are enabled, but no JavaMailSender is configured.");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(userEmail.trim());

        String fromAddress = notificationEmailProps.getFrom();
        if (fromAddress == null || fromAddress.isBlank()) {
            fromAddress = environment.getProperty("APP_NOTIFICATIONS_EMAIL_FROM");
        }
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress.trim());
        }

        String subject = notificationEmailProps.getSubject();
        if (subject == null || subject.isBlank()) {
            subject = environment.getProperty("APP_NOTIFICATIONS_EMAIL_SUBJECT", "GamePlan notification");
        }
        message.setSubject(subject);
        message.setText(buildBody(user, notificationMessage));

        try {
            logger.debug("Sending notification email to {} with subject '{}'", userEmail, subject);
            mailSender.send(message);
            logger.debug("Notification email send accepted by mail sender for {}", userEmail);
        } catch (MailException ex) {
            logger.error("Failed to send notification email to {}", userEmail, ex);
        }
    }

    private boolean isEmailEnabled() {
        if (notificationEmailProps.isEnabled()) {
            return true;
        }
        String directEnv = environment.getProperty("APP_NOTIFICATIONS_EMAIL_ENABLED");
        return directEnv != null && Boolean.parseBoolean(directEnv.trim());
    }

    private String buildBody(User user, String notificationMessage) {
        String firstName = user.getFirstName();
        String greetingName = (firstName != null && !firstName.isBlank()) ? firstName.trim() : "athlete";
        return """
                Hello %s,

                You have a new GamePlan notification:
                %s

                Please log in to GamePlan for details.
                """.formatted(greetingName, notificationMessage);
    }
}
