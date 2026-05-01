package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.AppSettingsResponseDTO;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.AppSettingsService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

/**
 * Admin endpoints for reading and updating the singleton application settings row.
 */
@RestController
@RequestMapping("/api/admin")
public class AppSettingsController {
    private final UserService userService;
    private final AppSettingsService appSettingsService;

    /**
     * Exposes read and update endpoints for global calendar and reservation settings.
     */
    public AppSettingsController(UserService userService, AppSettingsService appSettingsService) {
        this.userService = userService;
        this.appSettingsService = appSettingsService;
    }

    /**
     * Returns the current application settings.
     */
    @GetMapping("/settings")
    public AppSettingsResponseDTO getAppSettings() {
        return appSettingsService.getAppSettings();
    }

    /**
     * Updates global calendar and reservation settings after admin authorization.
     */
    @PutMapping("/settings")
    public AppSettingsResponseDTO updateAppSettings(
            OAuth2AuthenticationToken authentication,
            @RequestBody AppSettingsResponseDTO newSettings) {
        final User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return appSettingsService.updateAppSettings(newSettings);
    }
}
