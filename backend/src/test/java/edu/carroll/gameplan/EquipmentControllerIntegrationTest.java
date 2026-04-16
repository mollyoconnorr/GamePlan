package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.EquipmentController;
import edu.carroll.gameplan.dto.request.EquipmentStatusUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentStatusUpdateResponse;
import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.EquipmentType;
import edu.carroll.gameplan.model.Notification;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import edu.carroll.gameplan.repository.NotificationRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import edu.carroll.gameplan.repository.ScheduleBlockRepository;
import edu.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests verifying {@link EquipmentController} against the Spring context
 * and real repositories.
 */
@SpringBootTest
@Transactional
public class EquipmentControllerIntegrationTest {

    @Autowired
    private EquipmentController equipmentController;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScheduleBlockRepository scheduleBlockRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private OAuth2AuthenticationToken authToken;
    private OAuth2AuthenticationToken athleteAuthToken;
    private Equipment equipment;
    private User athlete;

    @BeforeEach
    /**
     * Seeds the test database with users, equipment, and a reservation before each test run.
     */
    void setUp() {
        reservationRepository.deleteAll();
        notificationRepository.deleteAll();
        scheduleBlockRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = new User();
        admin.setEmail("at@example.com");
        admin.setFirstName("AT");
        admin.setLastName("Admin");
        admin.setOidcUserId("at-sub");
        admin.setRole(UserRole.AT);
        userRepository.save(admin);

        athlete = new User();
        athlete.setEmail("athlete@example.com");
        athlete.setFirstName("Ath");
        athlete.setLastName("Olete");
        athlete.setOidcUserId("athlete-sub");
        athlete.setRole(UserRole.ATHLETE);
        athlete = userRepository.save(athlete);

        EquipmentType type = new EquipmentType();
        type.setName("Test Type");
        type.setFieldSchema("{}");
        equipmentTypeRepository.save(type);

        equipment = new Equipment();
        equipment.setName("Test Equipment");
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setEquipmentType(type);
        equipmentRepository.save(equipment);

        Reservation reservation = new Reservation();
        reservation.setEquipment(equipment);
        reservation.setUser(athlete);
        reservation.setStartDatetime(LocalDateTime.now().plusHours(1));
        reservation.setEndDatetime(LocalDateTime.now().plusHours(2));
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservationRepository.save(reservation);

        this.authToken = buildAuthToken("at-sub");
        this.athleteAuthToken = buildAuthToken("athlete-sub");
    }

    private OAuth2AuthenticationToken buildAuthToken(String oidcSub) {
        OidcIdToken token = new OidcIdToken(
                "token-" + oidcSub,
                Instant.now(),
                Instant.now().plusSeconds(1000),
                Map.of("sub", oidcSub)
        );
        DefaultOidcUser oidcUser = new DefaultOidcUser(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                token
        );
        return new OAuth2AuthenticationToken(oidcUser, oidcUser.getAuthorities(), "okta");
    }

    @Test
    void updateStatusCancelsReservationsAndCreatesNotifications() {
        EquipmentStatusUpdateRequest request = new EquipmentStatusUpdateRequest();
        request.setStatus(EquipmentStatus.MAINTENANCE.name());

        EquipmentStatusUpdateResponse response = equipmentController.updateEquipmentStatus(
                equipment.getId(),
                request,
                authToken
        );

        Reservation reservation = reservationRepository.findAll().getFirst();
        List<Notification> notifications = notificationRepository.findByUserAndReadFalse(athlete);

        assertEquals("MAINTENANCE", response.equipment().getStatus());
        assertEquals(1, response.canceledReservations());
        assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
        assertFalse(notifications.isEmpty());
    }

    @Test
    void updateStatusToAvailableDoesNotCancelReservations() {
        EquipmentStatusUpdateRequest request = new EquipmentStatusUpdateRequest();
        request.setStatus(EquipmentStatus.AVAILABLE.name());

        EquipmentStatusUpdateResponse response = equipmentController.updateEquipmentStatus(
                equipment.getId(),
                request,
                authToken
        );

        Reservation reservation = reservationRepository.findAll().getFirst();

        assertEquals("AVAILABLE", response.equipment().getStatus());
        assertEquals(0, response.canceledReservations());
        assertEquals(ReservationStatus.ACTIVE, reservation.getStatus());
        assertTrue(notificationRepository.findByUserAndReadFalse(athlete).isEmpty());
    }

    @Test
    void deleteEquipmentCancelsReservationsAndDeletesEquipment() {
        ResponseEntity<Void> response = equipmentController.deleteEquipment(equipment.getId(), authToken);

        assertEquals(HttpStatusCode.valueOf(204), response.getStatusCode());
        assertTrue(equipmentRepository.findById(equipment.getId()).isEmpty());
        assertTrue(reservationRepository.findAll().isEmpty());
        assertFalse(notificationRepository.findByUserAndReadFalse(athlete).isEmpty());
    }

    @Test
    void getAllEquipmentRequiresTrainerRole() {
        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> equipmentController.getAllEquipment(athleteAuthToken)
        );

        assertEquals("Trainer or admin role required", exception.getMessage());
    }
}
