package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
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

/**
 * Unit tests for {@link ReservationService} covering ownership, conflicts, and validation rules.
 */
@ExtendWith(MockitoExtension.class)
class ReservationServiceUnitTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private ScheduleBlockService scheduleBlockService;

    @InjectMocks
    private ReservationService reservationService;

    private User user;
    private Equipment equipment;

    /**
     * Sets up a default user and equipment fixture.
     */
    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setRole(UserRole.ATHLETE);
        equipment = new Equipment();
        equipment.setId(2L);
    }

    /**
     * Ensures overlapping equipment reservations are rejected.
     */
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

    /**
     * Confirms only owners or trainers may cancel reservations.
     */
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

    /**
     * Validates the service enforces proper start/end ordering.
     */
    @Test
    void updateReservationRejectsConflictingSlots() {
        LocalDateTime start = LocalDateTime.now();
        assertThatThrownBy(() -> reservationService.updateReservation(7L, start, start, user))
                .hasMessageContaining("End time must be after start time");
    }
}
