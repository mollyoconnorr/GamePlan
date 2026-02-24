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
        reservation.setStatus(ReservationStatus.ACTIVE);
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

        Reservation activeRes = new Reservation();
        activeRes.setStartDatetime(LocalDateTime.now().plusHours(1));
        activeRes.setEndDatetime(LocalDateTime.now().plusHours(2));
        activeRes.setStatus(ReservationStatus.ACTIVE);
        activeRes.setUser(testUser);
        activeRes.setEquipment(testEquipment);
        reservationRepository.save(activeRes);

        Reservation cancelledRes = new Reservation();
        cancelledRes.setStartDatetime(LocalDateTime.now().plusHours(3));
        cancelledRes.setEndDatetime(LocalDateTime.now().plusHours(4));
        cancelledRes.setStatus(ReservationStatus.CANCELLED);
        cancelledRes.setUser(testUser);
        cancelledRes.setEquipment(testEquipment);
        reservationRepository.save(cancelledRes);

        List<Reservation> active = reservationRepository.findByStatus(ReservationStatus.ACTIVE);
        List<Reservation> cancelled = reservationRepository.findByStatus(ReservationStatus.CANCELLED);

        assertThat(active).hasSize(1);
        assertThat(cancelled).hasSize(1);

        assertThat(active.get(0).getStatus()).isEqualTo(ReservationStatus.ACTIVE);
        assertThat(cancelled.get(0).getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }

    @Test
    void shouldFindByUserIdAndEquipmentId() {

        Reservation res = new Reservation();
        res.setStartDatetime(LocalDateTime.now().plusHours(1));
        res.setEndDatetime(LocalDateTime.now().plusHours(2));
        res.setStatus(ReservationStatus.ACTIVE);
        res.setUser(testUser);
        res.setEquipment(testEquipment);
        reservationRepository.save(res);

        List<Reservation> byUser =
                reservationRepository.findByUser_Id(testUser.getId());

        List<Reservation> byEquipment =
                reservationRepository.findByEquipment_Id(testEquipment.getId());

        List<Reservation> byUserAndStatus =
                reservationRepository.findByUser_IdAndStatus(
                        testUser.getId(),
                        ReservationStatus.ACTIVE
                );

        assertThat(byUser).hasSize(1);
        assertThat(byEquipment).hasSize(1);
        assertThat(byUserAndStatus).hasSize(1);
    }
}
