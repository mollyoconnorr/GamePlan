package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.UserDto;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * User endpoints for the authenticated SPA session.
 *
 * <p>The frontend uses this controller to load the current local user record
 * after Okta completes login.</p>
 */
@RestController
@RequestMapping("/api")
public class UserController {

    /** Service used to resolve the authenticated user's persisted data. */
    private final UserService userService;

    /**
     * Exposes the authenticated user endpoint used by the frontend auth context.
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns the local GamePlan user record for the current Okta session.
     */
    @GetMapping("/user")
    public ResponseEntity<UserDto> getUser(OAuth2AuthenticationToken authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        User user = userService.resolveCurrentUser(authentication);

        UserDto dto = new UserDto(
                user.getOidcUserId(),
                user.getEmail(),
                user.getOidcUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole() != null ? user.getRole().name() : UserRole.ATHLETE.name(),
                user.isPendingApproval()
        );

        return ResponseEntity.ok(dto);
    }
}
