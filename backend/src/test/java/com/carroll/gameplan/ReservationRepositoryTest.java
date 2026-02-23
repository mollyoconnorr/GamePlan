package com.carroll.gameplan;

import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class ReservationRepositoryTest {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    private User testUser;
    private Equipment testEquipment;

    @BeforeEach
    void setup() {
        // Create EquipmentType
        EquipmentType treadmillType = new EquipmentType();
        treadmillType.setName("Treadmill");
        treadmillType = equipmentTypeRepository.save(treadmillType);

        // Create User
        testUser = new User();
        testUser.setEmail("john.doe@example.com");
        testUser.setOidcSubject("oidc-12345");
        testUser.setRole(UserRole.ATHLETE);
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser = userRepository.save(testUser);

        // Create Equipment
        testEquipment = new Equipment();
        testEquipment.setName("Treadmill #1");
        testEquipment.setStatus(EquipmentStatus.AVAILABLE);
        testEquipment.setEquipmentType(treadmillType);
        testEquipment = equipmentRepository.save(testEquipment);
    }

    @Test
    void shouldSaveAndFindReservationById() {
        Reservation reservation = new Reservation();
        reservation.setStartDatetime(LocalDateTime.now().plusHours(1));
        reservation.setEndDatetime(LocalDateTime.now().plusHours(2));
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setUser(testUser);
        reservation.setEquipment(testEquipment);

        reservation = reservationRepository.save(reservation);

        Reservation found = reservationRepository.findById(reservation.getId()).orElse(null);
        assertThat(found).isNotNull();
        assertThat(found.getUser().getEmail()).isEqualTo("john.doe@example.com");
        assertThat(found.getEquipment().getName()).isEqualTo("Treadmill #1");
    }

    @Test
    void shouldFindByStatus() {
        Reservation res1 = new Reservation();
        res1.setStartDatetime(LocalDateTime.now().plusHours(1));
        res1.setEndDatetime(LocalDateTime.now().plusHours(2));
        res1.setStatus(ReservationStatus.PENDING);
        res1.setUser(testUser);
        res1.setEquipment(testEquipment);
        reservationRepository.save(res1);

        Reservation res2 = new Reservation();
        res2.setStartDatetime(LocalDateTime.now().plusHours(3));
        res2.setEndDatetime(LocalDateTime.now().plusHours(4));
        res2.setStatus(ReservationStatus.APPROVED);
        res2.setUser(testUser);
        res2.setEquipment(testEquipment);
        reservationRepository.save(res2);

        List<Reservation> pending = reservationRepository.findByStatus(ReservationStatus.PENDING);
        List<Reservation> approved = reservationRepository.findByStatus(ReservationStatus.APPROVED);

        assertThat(pending).hasSize(1);
        assertThat(approved).hasSize(1);
        assertThat(pending.get(0).getStatus()).isEqualTo(ReservationStatus.PENDING);
        assertThat(approved.get(0).getStatus()).isEqualTo(ReservationStatus.APPROVED);
    }

    @Test
    void shouldFindByUserIdAndEquipmentId() {
        Reservation res = new Reservation();
        res.setStartDatetime(LocalDateTime.now().plusHours(1));
        res.setEndDatetime(LocalDateTime.now().plusHours(2));
        res.setStatus(ReservationStatus.PENDING);
        res.setUser(testUser);
        res.setEquipment(testEquipment);
        reservationRepository.save(res);

        List<Reservation> byUser = reservationRepository.findByUser_Id(testUser.getId());
        List<Reservation> byEquipment = reservationRepository.findByEquipment_Id(testEquipment.getId());
        List<Reservation> byUserAndStatus = reservationRepository.findByUser_IdAndStatus(testUser.getId(), ReservationStatus.PENDING);

        assertThat(byUser).hasSize(1);
        assertThat(byEquipment).hasSize(1);
        assertThat(byUserAndStatus).hasSize(1);
    }
}
