package com.carroll.gameplan;


import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ReservationServiceTest {

    private ReservationRepository reservationRepository;
    private EquipmentRepository equipmentRepository;
    private UserRepository userRepository;
    private ReservationService reservationService;

    private User testUser;
    private Equipment testEquipment;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        equipmentRepository = mock(EquipmentRepository.class);
        userRepository = mock(UserRepository.class);

        reservationService = new ReservationService(reservationRepository, equipmentRepository, userRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setRole(UserRole.ATHLETE);
        testUser.setOidcSubject("user-123");

        testEquipment = new Equipment();
        testEquipment.setId(10L);
        testEquipment.setName("Treadmill");
    }

    @Test
    void createReservation_success() {
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime end = start.plusHours(1);

        when(userRepository.findByOidcSubject("user-123")).thenReturn(Optional.of(testUser));
        when(equipmentRepository.findById(10L)).thenReturn(Optional.of(testEquipment));
        when(reservationRepository.findByEquipment_Id(10L)).thenReturn(Collections.emptyList());
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(i -> i.getArguments()[0]);

        Reservation res = reservationService.createReservation("user-123", 10L, start, end);

        assertThat(res.getUser()).isEqualTo(testUser);
        assertThat(res.getEquipment()).isEqualTo(testEquipment);
        assertThat(res.getStatus()).isEqualTo(ReservationStatus.ACTIVE);
    }

    @Test
    void createReservation_conflict() {
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime end = start.plusHours(1);

        Reservation existing = new Reservation();
        existing.setStartDatetime(start.minusMinutes(30));
        existing.setEndDatetime(end.plusMinutes(30));
        existing.setStatus(ReservationStatus.ACTIVE);

        when(userRepository.findByOidcSubject("user-123")).thenReturn(Optional.of(testUser));
        when(equipmentRepository.findById(10L)).thenReturn(Optional.of(testEquipment));
        when(reservationRepository.findByEquipment_Id(10L)).thenReturn(Collections.singletonList(existing));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> reservationService.createReservation("user-123", 10L, start, end));

        assertThat(ex.getMessage()).isEqualTo("Equipment not available for that time.");
    }

    @Test
    void cancelReservation_success() {
        Reservation res = new Reservation();
        res.setId(1L);
        res.setUser(testUser);
        res.setStatus(ReservationStatus.ACTIVE);

        when(userRepository.findByOidcSubject("user-123")).thenReturn(Optional.of(testUser));
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(res));
        when(reservationRepository.save(res)).thenReturn(res);

        reservationService.cancelReservation("user-123", 1L);

        assertThat(res.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }
}
