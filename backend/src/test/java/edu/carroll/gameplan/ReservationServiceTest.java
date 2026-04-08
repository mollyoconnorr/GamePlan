package edu.carroll.gameplan;

import edu.carroll.gameplan.model.*;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import edu.carroll.gameplan.repository.ScheduleBlockRepository;
import edu.carroll.gameplan.repository.UserRepository;
import edu.carroll.gameplan.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for the {@link ReservationService}.
 *
 * <p>
 * These tests cover creating, updating, and canceling reservations.
 * The tests use an in-memory database (H2) via the "test" Spring profile.
 * </p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional  // Each test runs in a transaction that's rolled back after completion
public class ReservationServiceTest {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    @Autowired
    private ScheduleBlockRepository scheduleBlockRepository;

    private User testUser;           // The test user used in reservations
    private Equipment testEquipment; // The test equipment used in reservations

    /**
     * Sets up test data before each test method.
     * Creates a user, equipment type, and equipment for testing.
     */
    @BeforeEach
    public void setUp() {
        // ===== Create a test user =====
        testUser = new User();
        testUser.setEmail("testuser@carroll.edu");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setRole(UserRole.ATHLETE);
        testUser = userRepository.save(testUser);

        // ===== Create EquipmentType for test =====
        EquipmentType type = new EquipmentType();
        type.setName("Basketball Hoop");
        type.setFieldSchema("{}"); // Default empty JSON schema
        type = equipmentTypeRepository.save(type);

        // ===== Create test equipment =====
        testEquipment = new Equipment();
        testEquipment.setName("Gym Hoop #1");
        testEquipment.setStatus(EquipmentStatus.AVAILABLE);
        testEquipment.setEquipmentType(type); // associate with equipment type
        testEquipment = equipmentRepository.save(testEquipment);

        scheduleBlockRepository.deleteAll();
    }

    /**
     * Tests creating a reservation for a user and equipment.
     * Validates that the reservation is stored correctly and has the ACTIVE status.
     */
    @Test
    public void testCreateReservation() {
        LocalDateTime start = LocalDateTime.now().plusMinutes(5); // 5 minutes from now
        LocalDateTime end = start.plusHours(1);                   // 1 hour reservation

        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        // Assertions
        assertNotNull(reservation.getId(), "Reservation ID should be generated");
        assertEquals(ReservationStatus.ACTIVE, reservation.getStatus(), "Reservation should be ACTIVE");
        assertEquals(testUser.getId(), reservation.getUser().getId(), "Reservation user ID should match");
        assertEquals(testEquipment.getId(), reservation.getEquipment().getId(), "Reservation equipment ID should match");
    }

    /**
     * Tests canceling a reservation.
     * Validates that the reservation status is updated to CANCELLED.
     *
     * @throws Exception if the reservation cannot be canceled
     */
    @Test
    public void testCancelReservation() throws Exception {
        // Create a reservation first
        LocalDateTime start = LocalDateTime.now().plusMinutes(5);
        LocalDateTime end = start.plusHours(1);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        // Cancel the reservation
        Reservation cancelled = reservationService.cancelReservation(reservation.getId(), testUser);

        // Assert the status has changed
        assertEquals(ReservationStatus.CANCELLED, cancelled.getStatus(), "Reservation should be CANCELLED");
    }

    /**
     * Tests updating a reservation's start and end times.
     * Validates that the reservation's times are updated correctly.
     */
    @Test
    public void testUpdateReservation() {
        // Create reservation first
        LocalDateTime start = LocalDateTime.now().plusMinutes(5);
        LocalDateTime end = start.plusHours(1);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        // New reservation times
        LocalDateTime newStart = start.plusMinutes(10);
        LocalDateTime newEnd = end.plusMinutes(10);

        // Update reservation
        Reservation updated = reservationService.updateReservation(reservation.getId(), newStart, newEnd, testUser);

        // Assertions
        assertEquals(newStart, updated.getStartDatetime(), "Reservation start time should be updated");
        assertEquals(newEnd, updated.getEndDatetime(), "Reservation end time should be updated");
    }

    @Test
    public void testCreateReservationRejectsBlockedTime() {
        User trainer = new User();
        trainer.setEmail("trainer@carroll.edu");
        trainer.setFirstName("Trainer");
        trainer.setLastName("User");
        trainer.setRole(UserRole.AT);
        trainer = userRepository.save(trainer);

        LocalDateTime start = LocalDateTime.now().plusHours(3).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);

        ScheduleBlock block = new ScheduleBlock();
        block.setCreatedBy(trainer);
        block.setStartDatetime(start.minusMinutes(15));
        block.setEndDatetime(end.plusMinutes(15));
        block.setStatus(ScheduleBlockStatus.ACTIVE);
        scheduleBlockRepository.save(block);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> reservationService.createReservation(testUser, testEquipment, start, end)
        );

        assertEquals("This time slot is blocked by an admin.", exception.getMessage());
    }

    @Test
    public void testUpdateReservationRejectsBlockedTime() {
        User trainer = new User();
        trainer.setEmail("trainer2@carroll.edu");
        trainer.setFirstName("Trainer");
        trainer.setLastName("Two");
        trainer.setRole(UserRole.ADMIN);
        trainer = userRepository.save(trainer);

        LocalDateTime start = LocalDateTime.now().plusHours(4).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        LocalDateTime blockedStart = end.plusMinutes(15);
        LocalDateTime blockedEnd = blockedStart.plusMinutes(30);

        ScheduleBlock block = new ScheduleBlock();
        block.setCreatedBy(trainer);
        block.setStartDatetime(blockedStart.minusMinutes(5));
        block.setEndDatetime(blockedEnd.plusMinutes(5));
        block.setStatus(ScheduleBlockStatus.ACTIVE);
        scheduleBlockRepository.save(block);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> reservationService.updateReservation(reservation.getId(), blockedStart, blockedEnd, testUser)
        );

        assertEquals("This time slot is blocked by an admin.", exception.getMessage());
    }

    @Test
    public void testCancelReservationAllowsAdmin() {
        LocalDateTime start = LocalDateTime.now().plusHours(5).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        User admin = new User();
        admin.setEmail("admin@carroll.edu");
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setRole(UserRole.ADMIN);
        admin = userRepository.save(admin);

        Reservation cancelled = reservationService.cancelReservation(reservation.getId(), admin);
        assertEquals(ReservationStatus.CANCELLED, cancelled.getStatus(), "Admin should be able to cancel reservations");
    }
}
