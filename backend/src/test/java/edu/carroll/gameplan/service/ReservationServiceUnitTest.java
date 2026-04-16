package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.AppSettingsRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
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

    @Mock
    private NotificationService notificationService;

    @Mock
    private AppSettingsRepository appSettingsRepository;

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
        lenient().when(appSettingsRepository.findById(any())).thenReturn(java.util.Optional.empty());
    }

    /**
     * Ensures overlapping equipment reservations are rejected.
     */
    @Test
    void createReservationThrowsWhenEquipmentReserved() {
        LocalDateTime start = LocalDateTime.now().plusMinutes(2L);
        LocalDateTime end = start.plusMinutes(30);
        when(reservationRepository.findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                any(), any(), any(), any()))
                .thenReturn(List.of(new Reservation()));

        assertThatThrownBy(() -> reservationService.createReservation(user, equipment, start, end))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already reserved");
    }

    /**
     * Ensures reservation creation is rejected when equipment is not available.
     */
    @Test
    void createReservationRejectsUnavailableEquipment() {
        LocalDateTime start = LocalDateTime.now().plusMinutes(2L);
        LocalDateTime end = start.plusMinutes(30);
        equipment.setStatus(EquipmentStatus.MAINTENANCE);
        when(reservationRepository.findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() -> reservationService.createReservation(user, equipment, start, end))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Equipment is currently under maintenance");
    }

    /**
     * Ensures reservation creation is rejected when the start time is in the past.
     */
    @Test
    void createReservationRejectsPastStartTime() {
        LocalDateTime start = LocalDateTime.now().minusMinutes(1);
        LocalDateTime end = start.plusMinutes(30);

        assertThatThrownBy(() -> reservationService.createReservation(user, equipment, start, end))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Given start time has already passed!");
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
     * Confirms equipment lookups only request non-expired active reservations.
     */
    @Test
    void getActiveReservationsForEquipmentRequestsNonExpiredActiveReservations() {
        Reservation activeFutureReservation = new Reservation();
        activeFutureReservation.setId(44L);
        when(reservationRepository.findByEquipmentIdAndEndDatetimeAfterAndStatusIs(
                eq(2L), any(LocalDateTime.class), eq(ReservationStatus.ACTIVE)))
                .thenReturn(List.of(activeFutureReservation));

        List<Reservation> result = reservationService.getActiveReservationsForEquipment(2L);

        assertThat(result).containsExactly(activeFutureReservation);
        verify(reservationRepository).findByEquipmentIdAndEndDatetimeAfterAndStatusIs(
                eq(2L), any(LocalDateTime.class), eq(ReservationStatus.ACTIVE));
    }

    @Test
    void cancelReservationNotifiesOwnerWhenTrainerActs() {
        Reservation existing = new Reservation();
        existing.setId(5L);
        User owner = new User();
        owner.setId(3L);
        owner.setFirstName("Ath");
        owner.setLastName("Olete");
        existing.setUser(owner);
        existing.setStatus(ReservationStatus.ACTIVE);
        Equipment equipment = new Equipment();
        equipment.setName("Test Equipment");
        existing.setEquipment(equipment);
        existing.setStartDatetime(LocalDateTime.now().plusHours(1));
        when(reservationRepository.findById(5L)).thenReturn(java.util.Optional.of(existing));
        when(reservationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        User trainer = new User();
        trainer.setId(4L);
        trainer.setRole(UserRole.AT);
        trainer.setFirstName("Sam");
        trainer.setLastName("Coach");

        reservationService.cancelReservation(5L, trainer);

        verify(notificationService).createNotification(eq(owner), anyString());
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

    /**
     * Ensures reservation updates are rejected when the new start time is in the past.
     */
    @Test
    void updateReservationRejectsPastStartTime() {
        LocalDateTime newStart = LocalDateTime.now().minusMinutes(1);
        LocalDateTime newEnd = newStart.plusMinutes(30);

        assertThatThrownBy(() -> reservationService.updateReservation(7L, newStart, newEnd, user))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Given start time has already passed!");
    }

    /**
     * Ensures updates are rejected when the existing reservation has already started.
     */
    @Test
    void updateReservationRejectsEditingPastReservation() {
        Reservation existing = new Reservation();
        existing.setId(7L);
        existing.setUser(user);
        existing.setEquipment(equipment);
        existing.setStartDatetime(LocalDateTime.now().minusHours(2));
        existing.setEndDatetime(LocalDateTime.now().minusHours(1));

        when(reservationRepository.findById(7L)).thenReturn(java.util.Optional.of(existing));

        LocalDateTime newStart = LocalDateTime.now().plusHours(1);
        LocalDateTime newEnd = newStart.plusMinutes(30);

        assertThatThrownBy(() -> reservationService.updateReservation(7L, newStart, newEnd, user))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Past reservations cannot be edited.");
    }

    /**
     * Ensures updates cancel and reject reservations when equipment is unavailable.
     */
    @Test
    void updateReservationCancelsWhenEquipmentUnavailable() {
        Reservation existing = new Reservation();
        existing.setId(7L);
        existing.setUser(user);
        equipment.setStatus(EquipmentStatus.MAINTENANCE);
        existing.setEquipment(equipment);
        existing.setStatus(ReservationStatus.ACTIVE);
        existing.setStartDatetime(LocalDateTime.now().plusHours(1));
        existing.setEndDatetime(LocalDateTime.now().plusHours(2));

        when(reservationRepository.findById(7L)).thenReturn(java.util.Optional.of(existing));
        when(reservationRepository.save(existing)).thenReturn(existing);

        LocalDateTime newStart = LocalDateTime.now().plusHours(3);
        LocalDateTime newEnd = newStart.plusMinutes(30);

        assertThatThrownBy(() -> reservationService.updateReservation(7L, newStart, newEnd, user))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Equipment is currently under maintenance.");

        assertThat(existing.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        verify(reservationRepository).save(existing);
    }
}
