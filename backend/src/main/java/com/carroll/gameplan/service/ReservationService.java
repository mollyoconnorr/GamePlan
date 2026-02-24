package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * ReservationService
 *
 * This service handles all business logic related to Reservations in the GamePlan application.
 * Responsibilities include:
 *   - Creating new reservations linking a User and Equipment
 *   - Updating reservation status (PENDING, APPROVED, CANCELLED, COMPLETED)
 *   - Checking equipment availability for a given time period
 *   - Querying reservations by user, equipment, or status
 *   - Ensuring consistency with the Reservation entity and related entities
 */
@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;

    public ReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    /**
     * Create a new reservation if equipment is available
     */
    public Optional<Reservation> createReservation(User user,
                                                   Equipment equipment,
                                                   LocalDateTime start,
                                                   LocalDateTime end) {
        if (!isEquipmentAvailable(equipment, start, end)) {
            return Optional.empty(); // equipment is already reserved in this time range
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start);
        reservation.setEndDatetime(end);
        reservation.setStatus(ReservationStatus.PENDING); // default status
        return Optional.of(reservationRepository.save(reservation));
    }

    /**
     * Update the status of a reservation
     */
    public Reservation updateStatus(Reservation reservation, ReservationStatus status) {
        reservation.setStatus(status);
        return reservationRepository.save(reservation);
    }

    /**
     * Check if equipment is available during a given time period
     */
    public boolean isEquipmentAvailable(Equipment equipment, LocalDateTime start, LocalDateTime end) {
        List<Reservation> overlappingReservations = reservationRepository
                .findByEquipment_Id(equipment.getId())
                .stream()
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED
                        && r.getEndDatetime().isAfter(start)
                        && r.getStartDatetime().isBefore(end))
                .toList();

        return overlappingReservations.isEmpty();
    }

    /**
     * Find reservations by user
     */
    public List<Reservation> findByUser(User user) {
        return reservationRepository.findByUser_Id(user.getId());
    }

    /**
     * Find reservations by equipment
     */
    public List<Reservation> findByEquipment(Equipment equipment) {
        return reservationRepository.findByEquipment_Id(equipment.getId());
    }

    /**
     * Find reservations by status
     */
    public List<Reservation> findByStatus(ReservationStatus status) {
        return reservationRepository.findByStatus(status);
    }

    /**
     * Find reservations by user and status
     */
    public List<Reservation> findByUserAndStatus(User user, ReservationStatus status) {
        return reservationRepository.findByUser_IdAndStatus(user.getId(), status);
    }
}
