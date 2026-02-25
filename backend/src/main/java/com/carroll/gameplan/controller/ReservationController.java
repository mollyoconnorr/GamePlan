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

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;
    private final UserRepository userRepository;

    public ReservationController(ReservationService reservationService,
                                 UserRepository userRepository) {
        this.reservationService = reservationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<ReservationResponse> getReservations(OAuth2AuthenticationToken authentication) {
        String oidcUserId = authentication.getPrincipal().getAttribute("sub");

        User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return reservationService.getReservationsForUser(user).stream()
                .map(r -> new ReservationResponse(
                        r.getId(),
                        r.getEquipment().getName(),
                        r.getStartDatetime().toString(),
                        r.getEndDatetime().toString()
                ))
                .toList();
    }

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

    @DeleteMapping("/{id}")
    public Reservation cancelReservation(@PathVariable Long id) throws Exception {
        return reservationService.cancelReservation(id);
    }
}