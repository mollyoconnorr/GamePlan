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

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final EquipmentRepository equipmentRepository;

    public ReservationService(ReservationRepository reservationRepository, EquipmentRepository equipmentRepository) {
        this.reservationRepository = reservationRepository;
        this.equipmentRepository = equipmentRepository;
    }

    // ===== Function 1: Get all reservations for a user =====
    public List<Reservation> getReservationsForUser(User user) {
        return reservationRepository.findByUser(user);
    }

    public Reservation createReservation(User user, Equipment equipment, LocalDateTime start, LocalDateTime end) {
        //  Check if equipment is available
        List<Reservation> existingReservations = reservationRepository.findByEquipmentAndEndDatetimeAfterAndStartDatetimeBefore(
                equipment, start, end
        );

        if (!existingReservations.isEmpty()) {
            throw new IllegalArgumentException("Equipment is already reserved for this time slot.");
        }

        // Create and save the reservation
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start);
        reservation.setEndDatetime(end);
        reservation.setStatus(ReservationStatus.ACTIVE);

        return reservationRepository.save(reservation);
    }

    @Transactional
    public Reservation cancelReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));
        reservation.setStatus(ReservationStatus.CANCELLED);
        return reservationRepository.save(reservation);
    }

    // ===== Function 3: Update a reservation =====
    public Reservation updateReservation(Long reservationId, LocalDateTime newStart, LocalDateTime newEnd) {
        // Fetch the reservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found"));

        // Check for overlapping reservations (excluding this one)
        List<Reservation> overlapping = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBefore(
                        reservation.getEquipment(), newStart, newEnd
                );
        // Remove self from the list if present
        overlapping.removeIf(r -> r.getId().equals(reservationId));

        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("New time slot conflicts with existing reservations.");
        }

        // Update the reservation times
        reservation.setStartDatetime(newStart);
        reservation.setEndDatetime(newEnd);

        return reservationRepository.save(reservation);
    }
    public Equipment getEquipmentById(Long equipmentId) {
        return equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found with id: " + equipmentId));
    }

}
