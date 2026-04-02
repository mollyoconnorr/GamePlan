package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service class for managing reservations.
 * <p>
 * Handles CRUD operations for {@link Reservation}, including creating, updating,
 * canceling, and fetching reservations for a user. Also handles equipment availability checks.
 * </p>
 */
@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final EquipmentRepository equipmentRepository;
    private final ScheduleBlockService scheduleBlockService;

    /**
     * Constructor injection of repositories.
     *
     * @param reservationRepository repository for Reservation entities
     * @param equipmentRepository   repository for Equipment entities
     */
    public ReservationService(ReservationRepository reservationRepository,
                              EquipmentRepository equipmentRepository,
                              ScheduleBlockService scheduleBlockService) {
        this.reservationRepository = reservationRepository;
        this.equipmentRepository = equipmentRepository;
        this.scheduleBlockService = scheduleBlockService;
    }

    // ===== Function 1: Get all reservations for a user =====

    /**
     * Returns all reservations for a given user that are active.
     *
     * @param user the user whose reservations to fetch
     * @return list of reservations
     */
    public List<Reservation> getActiveReservationsForUser(User user) {
        return reservationRepository.findByUserAndStatusIs(user, ReservationStatus.ACTIVE);
    }

    // ===== Function 2: Create a new reservation =====

    /**
     * Creates a new reservation for a user and equipment within a specified time window.
     * Throws an exception if the equipment is already reserved during the requested period.
     *
     * @param user      the user creating the reservation
     * @param equipment the equipment to reserve
     * @param start     reservation start time
     * @param end       reservation end time
     * @return the saved reservation
     */
    public Reservation createReservation(User user, Equipment equipment, LocalDateTime start, LocalDateTime end) {
        if (end.isBefore(start) || end.equals(start)) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        if (scheduleBlockService.hasActiveBlockConflict(start, end)) {
            throw new IllegalArgumentException("This time slot is blocked by an admin.");
        }

        // Check if equipment is already reserved for overlapping time slots
        final List<Reservation> existingReservations = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(equipment, start, end, ReservationStatus.ACTIVE);

        if (!existingReservations.isEmpty()) {
            throw new IllegalArgumentException("Equipment is already reserved for this time slot.");
        }

        List<Reservation> userConflicts = reservationRepository
                .findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(user, start, end, ReservationStatus.ACTIVE);

        if (!userConflicts.isEmpty()) {
            throw new IllegalArgumentException("You already have a reservation during that time.");
        }

        // Create and save the new reservation
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start);
        reservation.setEndDatetime(end);
        reservation.setStatus(ReservationStatus.ACTIVE);

        return reservationRepository.save(reservation);
    }

    // ===== Function 3: Cancel a reservation =====

    /**
     * Cancels an existing reservation by setting its status to CANCELLED.
     * The cancellation is only allowed if the requesting user owns the reservation
     * or if they are an admin/trainer overriding an athlete booking.
     *
     * @param reservationId ID of the reservation to cancel
     * @param actingUser    User requesting the cancellation
     * @return the updated reservation
     */
    @Transactional
    public Reservation cancelReservation(Long reservationId, User actingUser) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));

        boolean isOwner = reservation.getUser().getId().equals(actingUser.getId());
        boolean isAdmin = UserRole.AT.equals(actingUser.getRole()) || UserRole.ADMIN.equals(actingUser.getRole());

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Only the reservation owner or an admin can cancel this reservation.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        return reservationRepository.save(reservation);
    }

    @Transactional(readOnly = true)
    public List<Reservation> getActiveReservationsForEquipment(Long equipmentId) {
        return reservationRepository.findByEquipmentIdAndStatusIs(equipmentId, ReservationStatus.ACTIVE);
    }

    /**
     * Returns all reservations currently marked as ACTIVE.
     *
     * @return list of active reservations
     */
    @Transactional(readOnly = true)
    public List<Reservation> getActiveReservations() {
        return reservationRepository.findByStatus(ReservationStatus.ACTIVE);
    }

    // ===== Function 4: Update an existing reservation =====

    /**
     * Updates the start and end times of an existing reservation.
     * Only the owner or an admin can edit a reservation.
     * Throws an exception if the new time slot conflicts with other reservations.
     *
     * @param reservationId ID of the reservation to update
     * @param newStart      new start time
     * @param newEnd        new end time
     * @param actingUser    User requesting the update
     * @return the updated reservation
     */
    public Reservation updateReservation(Long reservationId, LocalDateTime newStart, LocalDateTime newEnd, User actingUser) {
        if (newEnd.isBefore(newStart) || newEnd.equals(newStart)) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        if (scheduleBlockService.hasActiveBlockConflict(newStart, newEnd)) {
            throw new IllegalArgumentException("This time slot is blocked by an admin.");
        }

        // Fetch the reservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found"));

        boolean isOwner = reservation.getUser().getId().equals(actingUser.getId());
        boolean isAdmin = UserRole.AT.equals(actingUser.getRole()) || UserRole.ADMIN.equals(actingUser.getRole());

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Only the reservation owner or an admin can edit this reservation.");
        }

        // Check for overlapping reservations for the same equipment
        List<Reservation> overlapping = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                        reservation.getEquipment(), newStart, newEnd, ReservationStatus.ACTIVE);

        // Remove the current reservation from overlapping list if present
        overlapping.removeIf(r -> r.getId().equals(reservationId));

        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("New time slot conflicts with existing reservations.");
        }
        List<Reservation> userConflicts = reservationRepository
                .findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                        actingUser, newStart, newEnd, ReservationStatus.ACTIVE);
        userConflicts.removeIf(r -> r.getId().equals(reservationId));

        if (!userConflicts.isEmpty()) {
            throw new IllegalArgumentException("You already have another reservation during that time.");
        }

        // Update reservation times and save
        reservation.setStartDatetime(newStart);
        reservation.setEndDatetime(newEnd);

        return reservationRepository.save(reservation);
    }

    // ===== Function 5: Helper method to fetch equipment by ID =====

    /**
     * Retrieves equipment by its ID.
     *
     * @param equipmentId the equipment ID
     * @return the equipment entity
     * @throws IllegalArgumentException if the equipment is not found
     */
    public Equipment getEquipmentById(Long equipmentId) {
        return equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found with id: " + equipmentId));
    }
}
