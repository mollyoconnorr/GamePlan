package com.carroll.gameplan.service;

import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;

    public ReservationService(ReservationRepository reservationRepository,
                              EquipmentRepository equipmentRepository,
                              UserRepository userRepository) {
        this.reservationRepository = reservationRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    // ✅ Create Reservation (Athlete Only)
    public Reservation createReservation(String oidcSubject,
                                         Long equipmentId,
                                         LocalDateTime start,
                                         LocalDateTime end) {

        if (start.isAfter(end) || start.isEqual(end)) {
            throw new RuntimeException("Invalid reservation time range.");
        }

        User user = userRepository.findByOidcSubject(oidcSubject)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != UserRole.ATHLETE) {
            throw new RuntimeException("Only athletes can create reservations.");
        }

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("Equipment not found"));

        // Check for overlapping ACTIVE reservations
        List<Reservation> existingReservations =
                reservationRepository.findByEquipment_Id(equipmentId);

        for (Reservation r : existingReservations) {
            if (r.getStatus() == ReservationStatus.ACTIVE &&
                    start.isBefore(r.getEndDatetime()) &&
                    end.isAfter(r.getStartDatetime())) {

                throw new RuntimeException("Equipment not available for that time.");
            }
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start);
        reservation.setEndDatetime(end);
        reservation.setStatus(ReservationStatus.ACTIVE);

        return reservationRepository.save(reservation);
    }

    // ✅ Cancel Reservation (Must Own It)
    public void cancelReservation(String oidcSubject, Long reservationId) {

        User user = userRepository.findByOidcSubject(oidcSubject)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        // Ensure athlete owns reservation
        if (!reservation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only cancel your own reservations.");
        }

        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new RuntimeException("Completed reservations cannot be cancelled.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);
    }

    // ✅ View My Reservations
    public List<Reservation> getMyReservations(String oidcSubject) {

        User user = userRepository.findByOidcSubject(oidcSubject)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return reservationRepository.findByUser_Id(user.getId());
    }
}
