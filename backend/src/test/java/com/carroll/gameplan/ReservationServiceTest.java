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

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ReservationServiceTest {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    private User testUser;
    private Equipment testEquipment;

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
        type.setFieldSchema("{}");
        type = equipmentTypeRepository.save(type);

        // ===== Create test equipment =====
        testEquipment = new Equipment();
        testEquipment.setName("Gym Hoop #1");
        testEquipment.setStatus(EquipmentStatus.AVAILABLE);
        testEquipment.setDefaultResLength(60);
        testEquipment.setMinResLength(30);
        testEquipment.setMaxResLength(90);
        testEquipment.setMinTime(5);
        testEquipment.setMaxTime(120);
        testEquipment.setStepMin(5);
        testEquipment.setEquipmentType(type); // assign the entity
        testEquipment = equipmentRepository.save(testEquipment);
    }

    @Test
    public void testCreateReservation() {
        LocalDateTime start = LocalDateTime.now().plusMinutes(5);
        LocalDateTime end = start.plusHours(1);

        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        assertNotNull(reservation.getId());
        assertEquals(ReservationStatus.ACTIVE, reservation.getStatus());
        assertEquals(testUser.getId(), reservation.getUser().getId());
        assertEquals(testEquipment.getId(), reservation.getEquipment().getId());
    }

    @Test
    public void testCancelReservation() throws Exception {
        // First, create the reservation
        LocalDateTime start = LocalDateTime.now().plusMinutes(5);
        LocalDateTime end = start.plusHours(1);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        // Cancel it
        Reservation cancelled = reservationService.cancelReservation(reservation.getId());

        assertEquals(ReservationStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    public void testUpdateReservation() {
        // Create reservation first
        LocalDateTime start = LocalDateTime.now().plusMinutes(5);
        LocalDateTime end = start.plusHours(1);
        Reservation reservation = reservationService.createReservation(testUser, testEquipment, start, end);

        // Update reservation times
        LocalDateTime newStart = start.plusMinutes(10);
        LocalDateTime newEnd = end.plusMinutes(10);
        Reservation updated = reservationService.updateReservation(reservation.getId(), newStart, newEnd);

        assertEquals(newStart, updated.getStartDatetime());
        assertEquals(newEnd, updated.getEndDatetime());
    }
}
