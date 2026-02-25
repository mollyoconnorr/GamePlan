package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

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

    /**
     * Constructor injection of repositories.
     *
     * @param reservationRepository repository for Reservation entities
     * @param equipmentRepository   repository for Equipment entities
     */
    public ReservationService(ReservationRepository reservationRepository, EquipmentRepository equipmentRepository) {
        this.reservationRepository = reservationRepository;
        this.equipmentRepository = equipmentRepository;
    }

    // ===== Function 1: Get all reservations for a user =====

    /**
     * Returns all reservations for a given user.
     *
     * @param user the user whose reservations to fetch
     * @return list of reservations
     */
    public List<Reservation> getReservationsForUser(User user) {
        return reservationRepository.findByUser(user);
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
        // Check if equipment is already reserved for overlapping time slots
        List<Reservation> existingReservations = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBefore(equipment, start, end);

        if (!existingReservations.isEmpty()) {
            throw new IllegalArgumentException("Equipment is already reserved for this time slot.");
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
     * Uses @Transactional to ensure the update is persisted.
     *
     * @param reservationId ID of the reservation to cancel
     * @return the updated reservation
     */
    @Transactional
    public Reservation cancelReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));
        reservation.setStatus(ReservationStatus.CANCELLED);
        return reservationRepository.save(reservation);
    }

    // ===== Function 4: Update an existing reservation =====

    /**
     * Updates the start and end times of an existing reservation.
     * Throws an exception if the new time slot conflicts with other reservations.
     *
     * @param reservationId ID of the reservation to update
     * @param newStart      new start time
     * @param newEnd        new end time
     * @return the updated reservation
     */
    public Reservation updateReservation(Long reservationId, LocalDateTime newStart, LocalDateTime newEnd) {
        // Fetch the reservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found"));

        // Check for overlapping reservations for the same equipment
        List<Reservation> overlapping = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBefore(reservation.getEquipment(), newStart, newEnd);

        // Remove the current reservation from overlapping list if present
        overlapping.removeIf(r -> r.getId().equals(reservationId));

        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("New time slot conflicts with existing reservations.");
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
