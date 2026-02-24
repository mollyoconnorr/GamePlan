package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.ReservationRequest;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.service.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/**
 * ReservationController
 *
 * Handles HTTP requests related to Reservations for Athletes.
 * Features:
 *   - Create a new reservation
 *   - Cancel a reservation
 *   - View all reservations for the logged-in athlete
 *
 * Note: Only athletes can create/cancel their own reservations.
 */
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    /**
     * Create a new reservation for the logged-in athlete
     */
    @PostMapping
    public ResponseEntity<Reservation> createReservation(
            @Valid @RequestBody ReservationRequest request,
            Authentication authentication) {

        String oidcSubject = authentication.getName();

        Reservation reservation = reservationService.createReservation(
                oidcSubject,
                request.getEquipmentId(),
                request.getStartDatetime(),
                request.getEndDatetime()
        );

        return ResponseEntity.ok(reservation);
    }

    /**
     * Cancel a reservation owned by the logged-in athlete
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(
            @PathVariable Long id,
            Authentication authentication) {

        String oidcSubject = authentication.getName();

        reservationService.cancelReservation(oidcSubject, id);

        return ResponseEntity.ok().body("Reservation cancelled successfully.");
    }

    /**
     * Get all reservations for the logged-in athlete
     */
    @GetMapping("/me")
    public ResponseEntity<List<Reservation>> getMyReservations(
            Authentication authentication) {

        String oidcSubject = authentication.getName();

        List<Reservation> reservations = reservationService.getMyReservations(oidcSubject);

        return ResponseEntity.ok(reservations);
    }
}