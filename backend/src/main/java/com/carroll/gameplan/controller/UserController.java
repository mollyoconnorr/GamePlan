package com.carroll.gameplan.controller;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

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
    public Map<String, Object> getUser(OAuth2AuthenticationToken authentication) {
        // Extract and return user attributes from the OIDC principal
        return authentication.getPrincipal().getAttributes();
    }
}
