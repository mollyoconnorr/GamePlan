package com.carroll.gameplan;

import com.carroll.gameplan.controller.AppSettingsController;
import com.carroll.gameplan.dto.response.AppSettingsResponseDTO;
import com.carroll.gameplan.model.CalendarFirstDay;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.service.AppSettingsService;
import com.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AppSettingsController}.
 */
public class AppSettingsControllerTest {

    private UserService userService;
    private AppSettingsService appSettingsService;
    private AppSettingsController controller;
    private OAuth2AuthenticationToken authToken;
    private User adminUser;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        appSettingsService = mock(AppSettingsService.class);
        controller = new AppSettingsController(userService, appSettingsService);

        authToken = mock(OAuth2AuthenticationToken.class);

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setRole(UserRole.ADMIN);
        adminUser.setOidcUserId("admin-sub");

        when(userService.resolveCurrentUser(authToken)).thenReturn(adminUser);
    }

    @Test
    void testGetAppSettingsReturnsServiceResponseForAdmin() {
        AppSettingsResponseDTO expected = new AppSettingsResponseDTO(
                CalendarFirstDay.WEEK,
                LocalTime.of(8, 0),
                LocalTime.of(17, 0),
                15,
                60,
                7,
                LocalDate.now()
        );
        when(appSettingsService.getAppSettings()).thenReturn(expected);

        AppSettingsResponseDTO result = controller.getAppSettings(authToken);

        assertEquals(expected, result);
        verify(userService).resolveCurrentUser(authToken);
        verify(userService).requireAdmin(adminUser);
        verify(appSettingsService).getAppSettings();
    }

    @Test
    void testUpdateAppSettingsDelegatesToServiceForAdmin() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                CalendarFirstDay.CURR_DAY,
                LocalTime.of(9, 0),
                LocalTime.of(18, 0),
                30,
                90,
                14,
                LocalDate.of(2024, 1, 1)
        );
        AppSettingsResponseDTO expected = new AppSettingsResponseDTO(
                CalendarFirstDay.CURR_DAY,
                LocalTime.of(9, 0),
                LocalTime.of(18, 0),
                30,
                90,
                14,
                LocalDate.now()
        );
        when(appSettingsService.updateAppSettings(request)).thenReturn(expected);

        AppSettingsResponseDTO result = controller.updateAppSettings(authToken, request);

        assertEquals(expected, result);
        verify(userService).resolveCurrentUser(authToken);
        verify(userService).requireAdmin(adminUser);
        verify(appSettingsService).updateAppSettings(request);
    }

    @Test
    void testGetAppSettingsThrowsWhenUserIsNotAdmin() {
        doThrow(new AccessDeniedException("Admin role required"))
                .when(userService).requireAdmin(adminUser);

        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> controller.getAppSettings(authToken)
        );

        assertEquals("Admin role required", exception.getMessage());
        verify(userService).resolveCurrentUser(authToken);
        verify(userService).requireAdmin(adminUser);
        verify(appSettingsService, never()).getAppSettings();
    }

    @Test
    void testUpdateAppSettingsThrowsWhenUserIsNotAdmin() {
        doThrow(new AccessDeniedException("Admin role required"))
                .when(userService).requireAdmin(adminUser);
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                CalendarFirstDay.WEEK,
                LocalTime.of(8, 0),
                LocalTime.of(17, 0),
                15,
                60,
                7,
                LocalDate.now()
        );

        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> controller.updateAppSettings(authToken, request)
        );

        assertEquals("Admin role required", exception.getMessage());
        verify(userService).resolveCurrentUser(authToken);
        verify(userService).requireAdmin(adminUser);
        verify(appSettingsService, never()).updateAppSettings(request);
    }

    @Test
    void testGetAppSettingsPropagatesUserResolutionFailure() {
        RuntimeException error = new RuntimeException("User not found");
        when(userService.resolveCurrentUser(authToken)).thenThrow(error);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> controller.getAppSettings(authToken)
        );

        assertEquals("User not found", exception.getMessage());
        verify(userService).resolveCurrentUser(authToken);
        verify(appSettingsService, never()).getAppSettings();
    }
}
