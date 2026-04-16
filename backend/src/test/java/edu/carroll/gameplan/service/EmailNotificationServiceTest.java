package edu.carroll.gameplan.service;

import edu.carroll.gameplan.config.NotificationEmailProps;
import edu.carroll.gameplan.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailNotificationServiceTest {

    private ObjectProvider<JavaMailSender> mailSenderProvider;
    private NotificationEmailProps emailProps;
    private Environment environment;
    private JavaMailSender mailSender;
    private EmailNotificationService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        mailSenderProvider = (ObjectProvider<JavaMailSender>) mock(ObjectProvider.class);
        emailProps = new NotificationEmailProps();
        environment = mock(Environment.class);
        mailSender = mock(JavaMailSender.class);
        service = new EmailNotificationService(mailSenderProvider, emailProps, environment);
    }

    @Test
    void sendNotificationEmailSkipsWhenEmailFeatureDisabled() {
        emailProps.setEnabled(false);
        when(environment.getProperty("APP_NOTIFICATIONS_EMAIL_ENABLED")).thenReturn("false");

        User user = new User();
        user.setId(1L);
        user.setEmail("athlete@example.com");

        service.sendNotificationEmail(user, "Hello");

        verify(mailSenderProvider, never()).getIfAvailable();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.any(SimpleMailMessage.class));
    }

    @Test
    void sendNotificationEmailSkipsWhenUserMissingEmail() {
        emailProps.setEnabled(true);
        User user = new User();
        user.setId(2L);
        user.setEmail("   ");

        service.sendNotificationEmail(user, "Hello");

        verify(mailSenderProvider, never()).getIfAvailable();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.any(SimpleMailMessage.class));
    }

    @Test
    void sendNotificationEmailUsesConfiguredPropsAndSendsMessage() {
        emailProps.setEnabled(true);
        emailProps.setFrom(" notifications@gameplan.io ");
        emailProps.setSubject("GamePlan alert");
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);

        User user = new User();
        user.setId(3L);
        user.setEmail(" athlete@example.com ");
        user.setFirstName("Alex");

        service.sendNotificationEmail(user, "Reservation canceled");

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();

        assertEquals("athlete@example.com", message.getTo()[0]);
        assertEquals("notifications@gameplan.io", message.getFrom());
        assertEquals("GamePlan alert", message.getSubject());
        assertTrue(message.getText().contains("Alex"));
        assertTrue(message.getText().contains("Reservation canceled"));
    }

    @Test
    void sendNotificationEmailUsesEnvironmentFallbacks() {
        emailProps.setEnabled(false);
        emailProps.setFrom(" ");
        emailProps.setSubject(" ");
        when(environment.getProperty("APP_NOTIFICATIONS_EMAIL_ENABLED")).thenReturn("true");
        when(environment.getProperty("APP_NOTIFICATIONS_EMAIL_FROM")).thenReturn("env-from@gameplan.io");
        when(environment.getProperty(eq("APP_NOTIFICATIONS_EMAIL_SUBJECT"), eq("GamePlan notification")))
                .thenReturn("Env Subject");
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);

        User user = new User();
        user.setId(4L);
        user.setEmail("athlete@example.com");
        user.setFirstName(null);

        service.sendNotificationEmail(user, "New message");

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();

        assertEquals("env-from@gameplan.io", message.getFrom());
        assertEquals("Env Subject", message.getSubject());
        assertTrue(message.getText().contains("athlete"));
    }

    @Test
    void sendNotificationEmailReturnsWhenMailSenderUnavailable() {
        emailProps.setEnabled(true);
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);

        User user = new User();
        user.setId(5L);
        user.setEmail("athlete@example.com");

        service.sendNotificationEmail(user, "Message");

        verify(mailSenderProvider).getIfAvailable();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.any(SimpleMailMessage.class));
    }
}
