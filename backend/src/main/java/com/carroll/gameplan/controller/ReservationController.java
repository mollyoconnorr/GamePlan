package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.ReservationRequest;
import com.carroll.gameplan.dto.ReservationResponse;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.ZoneId;
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
    private final Logger logger = LoggerFactory.getLogger(ReservationController.class);

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
        return reservationService.getActiveReservationsForUser(user).stream()
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
        List<Reservation> reservations = reservationService.getActiveReservationsForEquipment(equipmentId);
        return reservations.stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getEquipment().getName(),
                        r.getStartDatetime().toString(),
                        r.getEndDatetime().toString()
                        // TODO: Add user name if matches OIDC user or is trainer reserving it, else add reserved
//                        r.getUser().getFirstName() + " " + r.getUser().getLastName() // <-- user who reserved
                ))
                .collect(Collectors.toList());
    }

    /**
     * POST /api/reservations
     * <p>
     * Creates a new reservation for the currently authenticated user.
     *
     * @param authentication The OAuth2 authentication token of the user.
     * @param request        The reservation details (equipmentId, start, end as ISO-8601).
     * @return A {@link ResponseEntity} containing the created {@link ReservationResponse}
     *         with HTTP status 201 (Created) and a Location header.
     */
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            OAuth2AuthenticationToken authentication,
            @RequestBody ReservationRequest request) {

        final String oidcUserId = authentication.getPrincipal().getAttribute("sub");

        final User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        final Reservation newRes = reservationService.createReservation(
                user,
                reservationService.getEquipmentById(request.getEquipmentId()),
                request.getStart()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime(),
                request.getEnd()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime()
        );

        final ReservationResponse response = new ReservationResponse(
                newRes.getId(),
                newRes.getEquipment().getName(),
                newRes.getStartDatetime().toString(),
                newRes.getEndDatetime().toString()
        );

        final URI location = URI.create("/api/reservations/" + newRes.getId());

        return ResponseEntity
                .created(location)
                .body(response);
    }

    /**
     * PUT /api/reservations/{id}
     * <p>
     * Updates an existing reservation's start and end times.
     *
     * @param id      The reservation ID.
     * @param request The update payload containing start/end in ISO-8601 UTC format.
     * @return The updated {@link ReservationResponse}.
     */
    @PutMapping("/{id}")
    public ReservationResponse updateReservation(@PathVariable Long id,
                                                 @RequestBody ReservationRequest request) {

        Reservation updated = reservationService.updateReservation(
                id,
                request.getStart()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime(),
                request.getEnd()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime()
        );

        return new ReservationResponse(
                updated.getId(),
                updated.getEquipment().getName(),
                updated.getStartDatetime().toString(),
                updated.getEndDatetime().toString()
        );
    }

    /**
     * Cancels an existing reservation.
     *
     * @param id The reservation ID.
     * @return The cancelled {@link Reservation}.
     * @throws Exception If the reservation does not exist.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> cancelReservation(@PathVariable Long id) throws Exception {
        reservationService.cancelReservation(id);
        logger.info("cancelReservation: Reservation #{} cancelled", id);
        return ResponseEntity.noContent().build();
    }
}