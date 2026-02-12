package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Returns information about the authenticated user.
 */
@RestController
@RequestMapping("/api")
public class UserController {
    private final Logger logger = LoggerFactory.getLogger(UserController.class);

    @GetMapping("/user")
    public UserDto user(@AuthenticationPrincipal OidcUser user) {
        return new UserDto(
                user.getSubject(),
                user.getEmail(),
                user.getPreferredUsername(),
                user.getGivenName(),
                user.getFamilyName()
        );
    }
}