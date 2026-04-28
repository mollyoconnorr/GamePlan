package edu.carroll.gameplan.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the current CSRF token so SPA clients can bootstrap token cookies when needed.
 */
@RestController
public class CsrfController {

    /**
     * Returns the CSRF token so the SPA can send state-changing requests through Spring Security.
     */
    @GetMapping("/api/csrf")
    public CsrfToken csrf(CsrfToken csrfToken) {
        return csrfToken;
    }
}
