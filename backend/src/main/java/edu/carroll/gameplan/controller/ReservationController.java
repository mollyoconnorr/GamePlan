package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.AdminReservationResponse;
import edu.carroll.gameplan.dto.request.ReservationRequest;
import edu.carroll.gameplan.dto.response.ReservationResponse;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.ReservationService;
import edu.carroll.gameplan.service.UserService;
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
    private final ReservationService reservationService;
    private final UserService userService;
    private final Logger logger = LoggerFactory.getLogger(ReservationController.class);

    /**
     * Constructor for dependency injection.
     *
     * @param reservationService The service handling reservation logic.
     * @param userService        Helper for resolving and validating the authenticated user.
     */
    public ReservationController(ReservationService reservationService,
                                 UserService userService) {
        this.reservationService = reservationService;
        this.userService = userService;
    }

    /**
     * Returns the equipment type color that the frontend can use to paint the reservation event.
     */
    private String resolveEquipmentColor(Reservation reservation) {
        if (reservation == null ||
                reservation.getEquipment() == null ||
                reservation.getEquipment().getEquipmentType() == null) {
            return null;
        }

        return reservation.getEquipment().getEquipmentType().getColor();
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
        User user = userService.resolveCurrentUser(authentication);

        // Map Reservations to DTOs for response
        return reservationService.getActiveReservationsForUser(user).stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getEquipment().getName(),
                        r.getStartDatetime().toString(),
                        r.getEndDatetime().toString(),
                        resolveEquipmentColor(r)
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
                        r.getEndDatetime().toString(),
                        resolveEquipmentColor(r)
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
     * with HTTP status 201 (Created) and a Location header.
     */
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            OAuth2AuthenticationToken authentication,
            @RequestBody ReservationRequest request) {

        final User user = userService.resolveCurrentUser(authentication);

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
                newRes.getEndDatetime().toString(),
                resolveEquipmentColor(newRes)
        );

        final URI location = URI.create("/api/reservations/" + newRes.getId());

        return ResponseEntity
                .created(location)
                .body(response);
    }

    /**
     * GET /api/reservations/admin
     * <p>
     * Returns all active athlete reservations for admin/trainer review.
     * </p>
     */
    @GetMapping("/admin")
    public List<AdminReservationResponse> getActiveReservationsForAdmin(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return reservationService.getActiveReservations().stream()
                .filter(reservation -> UserRole.ATHLETE.equals(reservation.getUser().getRole()))
                .map(reservation -> new AdminReservationResponse(
                        reservation.getId(),
                        reservation.getEquipment().getName(),
                        reservation.getStartDatetime(),
                        reservation.getEndDatetime(),
                        reservation.getUser().getFirstName(),
                        reservation.getUser().getLastName(),
                        resolveEquipmentColor(reservation)
                ))
                .collect(Collectors.toList());
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
                                                 OAuth2AuthenticationToken authentication,
                                                 @RequestBody ReservationRequest request) {

        User user = userService.resolveCurrentUser(authentication);

        Reservation updated = reservationService.updateReservation(
                id,
                request.getStart()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime(),
                request.getEnd()
                        .atZone(ZoneId.of("America/Denver"))
                        .toLocalDateTime(),
                user
        );

        return new ReservationResponse(
                updated.getId(),
                updated.getEquipment().getName(),
                updated.getStartDatetime().toString(),
                updated.getEndDatetime().toString(),
                resolveEquipmentColor(updated)
        );
    }

    /**
     * Cancels a reservation the calling user owns (or overrides as a trainer).
     *
     * @return 204 No Content when cancellation is successful
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> cancelReservation(@PathVariable Long id,
                                                    OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        reservationService.cancelReservation(id, user);
        logger.info("cancelReservation: Reservation #{} cancelled", id);
        return ResponseEntity.noContent().build();
    }

}
