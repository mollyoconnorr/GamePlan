package com.carroll.gameplan;

import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
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
        testEquipment.setDefaultResLength(60); // Default reservation length in minutes
        testEquipment.setMinResLength(30);
        testEquipment.setMaxResLength(90);
        testEquipment.setMinTime(5);
        testEquipment.setMaxTime(120);
        testEquipment.setStepMin(5);
        testEquipment.setEquipmentType(type); // associate with equipment type
        testEquipment = equipmentRepository.save(testEquipment);
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
        Reservation cancelled = reservationService.cancelReservation(reservation.getId());

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
        Reservation updated = reservationService.updateReservation(reservation.getId(), newStart, newEnd);

        // Assertions
        assertEquals(newStart, updated.getStartDatetime(), "Reservation start time should be updated");
        assertEquals(newEnd, updated.getEndDatetime(), "Reservation end time should be updated");
    }
}
