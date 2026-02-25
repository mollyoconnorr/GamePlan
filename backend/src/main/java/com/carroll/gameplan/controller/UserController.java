package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.UserDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static com.carroll.gameplan.model.UserRole.ATHLETE;

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
     * Retrieves the currently authenticated user's attributes.
     *
     * @param authentication The OAuth2 authentication token containing user info.
     * @return A map of user attributes, typically including name, email, and unique ID.
     */
    @GetMapping("/user")
    public ResponseEntity<UserDto> getUser(OAuth2AuthenticationToken authentication) {

        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Map<String, Object> user = authentication.getPrincipal().getAttributes();

        UserDto dto = new UserDto(
                (String) user.get("sub"),
                (String) user.get("email"),
                (String) user.get("preferred_username"),
                (String) user.get("given_name"),
                (String) user.get("family_name"),
                ATHLETE.toString()
        );

        return ResponseEntity.ok(dto);
    }
}
