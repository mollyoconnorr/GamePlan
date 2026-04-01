package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceUnitTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @InjectMocks
    private ReservationService reservationService;

    private User user;
    private Equipment equipment;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setRole(UserRole.ATHLETE);
        equipment = new Equipment();
        equipment.setId(2L);
    }

    @Test
    void createReservationThrowsWhenEquipmentReserved() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusMinutes(30);
        when(reservationRepository.findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                any(), any(), any(), any()))
                .thenReturn(List.of(new Reservation()));

        assertThatThrownBy(() -> reservationService.createReservation(user, equipment, start, end))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already reserved");
    }

    @Test
    void cancelReservationRestrictsNonOwner() {
        Reservation existing = new Reservation();
        existing.setId(5L);
        User other = new User();
        other.setId(2L);
        existing.setUser(other);
        existing.setStatus(ReservationStatus.ACTIVE);
        when(reservationRepository.findById(5L)).thenReturn(java.util.Optional.of(existing));

        assertThatThrownBy(() -> reservationService.cancelReservation(5L, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateReservationRejectsConflictingSlots() {
        Reservation current = new Reservation();
        current.setId(7L);
        current.setUser(user);
        current.setEquipment(equipment);
        current.setStatus(ReservationStatus.ACTIVE);

        when(reservationRepository.findById(7L)).thenReturn(java.util.Optional.of(current));
        when(reservationRepository.findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(any(), any(), any(), any()))
                .thenReturn(new java.util.ArrayList<>());
        when(reservationRepository.findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(any(), any(), any(), any()))
                .thenReturn(new java.util.ArrayList<>());

        LocalDateTime start = LocalDateTime.now();
        assertThatThrownBy(() -> reservationService.updateReservation(7L, start, start, user))
                .hasMessageContaining("End time must be after start time");
    }
}
