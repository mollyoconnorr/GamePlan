package com.carroll.gameplan;

import com.carroll.gameplan.controller.ReservationController;
import com.carroll.gameplan.dto.request.ReservationRequest;
import com.carroll.gameplan.dto.response.ReservationResponse;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.service.ReservationService;
import com.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the {@link ReservationController}.
 *
 * <p>
 * This test class uses Mockito to mock dependencies such as the {@link ReservationService} and {@link UserService}.
 * It tests the controller methods for fetching, updating, and canceling reservations.
 * </p>
 */
public class ReservationControllerTest {

    private ReservationService reservationService;   // Mocked service layer
    private UserService userService;                 // Mocked helper
    private ReservationController controller;        // Controller under test
    private OAuth2AuthenticationToken authToken;     // Mocked authentication token
    private User testUser;                            // Test user entity

    /**
     * Sets up mocks and test data before each test.
     */
    @BeforeEach
    void setUp() {
        reservationService = mock(ReservationService.class);
        userService = mock(UserService.class);
        controller = new ReservationController(reservationService, userService);

        // ===== Mock authentication token =====
        authToken = mock(OAuth2AuthenticationToken.class);
        OidcUser oidcUser = mock(OidcUser.class);

        // Mock the "sub" claim as the user's unique identifier
        when(oidcUser.getAttribute("sub")).thenReturn("user-123");
        when(authToken.getPrincipal()).thenReturn(oidcUser);

        // ===== Create a test user =====
        testUser = new User();
        testUser.setId(1L);
        testUser.setOidcUserId("user-123");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");

        // Mock helper to return this user
        when(userService.resolveCurrentUser(authToken)).thenReturn(testUser);
    }

    /**
     * Tests fetching reservations for a user.
     * Validates that the controller returns the correct reservation data.
     */
    @Test
    void testGetReservations() {
        // ===== Create a test reservation =====
        Reservation r1 = new Reservation();
        r1.setId(100L);
        r1.setUser(testUser);
        r1.setStartDatetime(LocalDateTime.of(2026, 2, 25, 14, 0));
        r1.setEndDatetime(LocalDateTime.of(2026, 2, 25, 15, 0));

        Equipment equipment = new Equipment();
        equipment.setId(1L);
        equipment.setName("Net 1");
        r1.setEquipment(equipment);

        // Mock service to return this reservation
        when(reservationService.getActiveReservationsForUser(testUser)).thenReturn(List.of(r1));

        // Call the controller method
        List<ReservationResponse> result = controller.getReservations(authToken);

        // ===== Assertions =====
        assertEquals(1, result.size(), "Should return 1 reservation");
        assertEquals("Net 1", result.get(0).getEquipmentName(), "Equipment name should match");
        assertEquals("2026-02-25T14:00", result.get(0).getStart().substring(0,16), "Start time should match");
        assertEquals("2026-02-25T15:00", result.get(0).getEnd().substring(0,16), "End time should match");
    }

    /**
     * Tests updating a reservation via the controller.
     * Validates that the controller returns a reservation with the expected ID.
     */
    @Test
    void testUpdateReservation() {
        // ===== Mock a reservation =====
        Reservation r = new Reservation();
        r.setId(200L);
        r.setStartDatetime(LocalDateTime.of(2026, 2, 25, 14, 0));
        r.setEndDatetime(LocalDateTime.of(2026, 2, 25, 15, 0));
        Equipment updatedEquipment = new Equipment();
        updatedEquipment.setId(11L);
        updatedEquipment.setName("Updated Equipment");
        r.setEquipment(updatedEquipment);

        // Mock service update method
        when(reservationService.updateReservation(eq(200L),
                any(LocalDateTime.class),
                any(LocalDateTime.class),
                eq(testUser)))
                .thenReturn(r);

        ReservationRequest request = new ReservationRequest();
        request.setStart(Instant.parse("2026-02-25T21:30:00.000Z"));
        request.setEnd(Instant.parse("2026-02-25T22:30:00.000Z"));

        // Call controller
        ReservationResponse updated = controller.updateReservation(
                200L,
                authToken,
                request
        );

        // ===== Assertion =====
        assertEquals(200L, updated.getId(), "Updated reservation ID should match");
    }

    /**
     * Tests canceling a reservation via the controller.
     * Validates that the controller returns a reservation with the expected ID.
     *
     * @throws Exception if cancelReservation fails
     */
    @Test
    void testCancelReservation() throws Exception {
        // ===== Mock a reservation =====
        Reservation r = new Reservation();
        r.setId(300L);

        // Mock service cancel method
        when(reservationService.cancelReservation(300L, testUser)).thenReturn(r);

        // Call controller
        ResponseEntity<Object> cancelled = controller.cancelReservation(300L, authToken);

        // ===== Assertion =====
        assertEquals(HttpStatusCode.valueOf(204), cancelled.getStatusCode(), "cancelReservation should return status 204 - No content found!");
    }
}
