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
 * REST controller for handling user-related API endpoints.
 * <p>
 * This controller currently provides a single endpoint to retrieve
 * the authenticated user's information from the OAuth2/OIDC authentication token.
 * </p>
 */
@RestController
@RequestMapping("/api")
public class UserController {

    /**
     * Service used to resolve the authenticated user's persisted data.
     */
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns the DTO for the authenticated user, including the stored application role.
     *
     * @param authentication current OAuth2 authentication token
     * @return OK with {@link UserDto} when the user exists; 404 when authentication is absent
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
