package com.carroll.gameplan;

import com.carroll.gameplan.controller.ReservationController;
import com.carroll.gameplan.dto.ReservationResponse;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

public class ReservationControllerTest {

    private ReservationService reservationService;
    private UserRepository userRepository;
    private ReservationController controller;
    private OAuth2AuthenticationToken authToken;
    private User testUser;

    @BeforeEach
    void setUp() {
        reservationService = mock(ReservationService.class);
        userRepository = mock(UserRepository.class);
        controller = new ReservationController(reservationService, userRepository);

        // Mock authentication token
        authToken = mock(OAuth2AuthenticationToken.class);
        OidcUser oidcUser = mock(OidcUser.class);
        when(oidcUser.getAttribute("sub")).thenReturn("user-123");
        when(authToken.getPrincipal()).thenReturn(oidcUser);

        // Create a test user
        testUser = new User();
        testUser.setId(1L);
        testUser.setOidcUserId("user-123");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");

        when(userRepository.findByOidcUserId("user-123")).thenReturn(Optional.of(testUser));
    }

    @Test
    void testGetReservations() {
        Reservation r1 = new Reservation();
        r1.setId(100L);
        r1.setUser(testUser);
        r1.setStartDatetime(LocalDateTime.of(2026, 2, 25, 14, 0));
        r1.setEndDatetime(LocalDateTime.of(2026, 2, 25, 15, 0));

        Equipment equipment = new Equipment();
        equipment.setId(1L);
        equipment.setName("Net 1");
        r1.setEquipment(equipment);

        when(reservationService.getReservationsForUser(testUser)).thenReturn(List.of(r1));

        List<ReservationResponse> result = controller.getReservations(authToken);

        assertEquals(1, result.size());
        assertEquals("Net 1", result.get(0).getEquipmentName());
        assertEquals("2026-02-25T14:00", result.get(0).getStart().substring(0,16));
        assertEquals("2026-02-25T15:00", result.get(0).getEnd().substring(0,16));
    }

    @Test
    void testUpdateReservation() {
        // Mock a reservation
        Reservation r = new Reservation();
        r.setId(200L);
        r.setStartDatetime(LocalDateTime.of(2026, 2, 25, 14, 0));
        r.setEndDatetime(LocalDateTime.of(2026, 2, 25, 15, 0));

        // Mock service
        when(reservationService.updateReservation(eq(200L),
                any(LocalDateTime.class),
                any(LocalDateTime.class)))
                .thenReturn(r);

        // Call controller
        Reservation updated = controller.updateReservation(
                200L,
                "2026-02-25T14:30:00",
                "2026-02-25T15:30:00"
        );

        assertEquals(200L, updated.getId());
    }

    @Test
    void testCancelReservation() throws Exception {
        // Mock a reservation
        Reservation r = new Reservation();
        r.setId(300L);

        // Mock service
        when(reservationService.cancelReservation(300L)).thenReturn(r);

        // Call controller
        Reservation cancelled = controller.cancelReservation(300L);

        assertEquals(300L, cancelled.getId());
    }
}
