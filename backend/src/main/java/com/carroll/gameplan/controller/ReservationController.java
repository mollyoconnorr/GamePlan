package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.ReservationRequest;
import com.carroll.gameplan.dto.ReservationResponse;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for managing reservations.
 * <p>
 * Provides endpoints to view, create, update, and cancel reservations
 * for the currently authenticated user, as well as viewing reservations
 * for specific equipment.
 * </p>
 */
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;
    private final UserRepository userRepository;

    /**
     * Constructor for dependency injection.
     *
     * @param reservationService The service handling reservation logic.
     * @param userRepository     The repository for accessing user data.
     */
    public ReservationController(ReservationService reservationService,
                                 UserRepository userRepository) {
        this.reservationService = reservationService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/reservations
     * <p>
     * Retrieves all reservations for the currently authenticated user.
     *
     * @param authentication The OAuth2 authentication token of the user.
     * @return A list of {@link ReservationResponse} objects representing the user's reservations.
     */
    @GetMapping
    public List<ReservationResponse> getReservations(OAuth2AuthenticationToken authentication) {
        // Get user's unique OIDC ID
        String oidcUserId = authentication.getPrincipal().getAttribute("sub");

        // Fetch the User entity
        User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Map Reservations to DTOs for response
        return reservationService.getReservationsForUser(user).stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getEquipment().getName(),
                        r.getStartDatetime().toString(),
                        r.getEndDatetime().toString()
                ))
                .toList();
    }

    /**
     * GET /api/reservations/{equipmentId}
     * <p>
     * Retrieves all reservations for a specific equipment.
     *
     * @param equipmentId The ID of the equipment.
     * @return A list of {@link ReservationResponse} objects, including the user who reserved.
     */
    @GetMapping("/{equipmentId}")
    public List<ReservationResponse> getEquipmentReservations(@PathVariable Long equipmentId) {
        List<Reservation> reservations = reservationService.getReservationsForEquipment(equipmentId);
        return reservations.stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getStartDatetime().toString(),
                        r.getEndDatetime().toString(),
                        r.getUser().getFirstName() + " " + r.getUser().getLastName()
                ))
                .collect(Collectors.toList());
    }

    /**
     * POST /api/reservations
     * <p>
     * Creates a new reservation for the currently authenticated user.
     *
     * @param authentication The OAuth2 authentication token of the user.
     * @param request        The reservation details (equipment ID, start, end).
     * @return The created {@link Reservation} entity.
     */
    @PostMapping
    public Reservation createReservation(
            OAuth2AuthenticationToken authentication,
            @RequestBody ReservationRequest request) {

        String oidcUserId = authentication.getPrincipal().getAttribute("sub");

        User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return reservationService.createReservation(
                user,
                reservationService.getEquipmentById(request.getEquipmentId()),
                LocalDateTime.parse(request.getStart()),
                LocalDateTime.parse(request.getEnd())
        );
    }

    /**
     * PUT /api/reservations/{id}
     * <p>
     * Updates the start and end times of an existing reservation.
     *
     * @param id    The reservation ID.
     * @param start The new start time in ISO_LOCAL_DATE_TIME format.
     * @param end   The new end time in ISO_LOCAL_DATE_TIME format.
     * @return The updated {@link Reservation}.
     */
    @PutMapping("/{id}")
    public Reservation updateReservation(@PathVariable Long id,
                                         @RequestParam String start,
                                         @RequestParam String end) {

        return reservationService.updateReservation(
                id,
                LocalDateTime.parse(start),
                LocalDateTime.parse(end)
        );
    }

    /**
     * DELETE /api/reservations/{id}
     * <p>
     * Cancels an existing reservation.
     *
     * @param id The reservation ID.
     * @return The cancelled {@link Reservation}.
     * @throws Exception If the reservation does not exist.
     */
    @DeleteMapping("/{id}")
    public Reservation cancelReservation(@PathVariable Long id) throws Exception {
        return reservationService.cancelReservation(id);
    }
}