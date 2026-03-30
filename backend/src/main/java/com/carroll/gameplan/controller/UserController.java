package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.UserDto;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.service.UserService;
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
     * Looks up the authenticated user in the database so the frontend can read
     * the persisted role (e.g., ATHLETE vs AT) in addition to the profile info.
     *
     * @param authentication The OAuth2 authentication token containing user info.
     * @return The full DTO describing the user.
     */
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

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
                user.getRole() != null ? user.getRole().name() : UserRole.ATHLETE.name()
        );

        return ResponseEntity.ok(dto);
    }
}
