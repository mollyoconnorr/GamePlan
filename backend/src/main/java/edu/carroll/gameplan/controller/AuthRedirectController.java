package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.config.SecurityProps;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Redirects framework login-error callbacks to the configured frontend URL so
 * the SPA can show the appropriate error state.
 */
@Controller
public class AuthRedirectController {

    private final SecurityProps securityProps;

    public AuthRedirectController(
            @Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps securityProps
    ) {
        this.securityProps = securityProps;
    }

    /**
     * Redirects failed OAuth logins back to the frontend with a login error flag.
     */
    @GetMapping("/login/error")
    public String redirectLoginError() {
        return "redirect:" + buildLoginFailureRedirectUrl(securityProps.getLogoutUrl());
    }

    /**
     * Reuses the configured logout URL when present and appends a login error
     * flag so the frontend can explain what happened.
     */
    private String buildLoginFailureRedirectUrl(String logoutUrl) {
        if (logoutUrl == null || logoutUrl.isBlank()) {
            return "/?loginError=true";
        }

        final String separator = logoutUrl.contains("?") ? "&" : "?";
        return logoutUrl + separator + "loginError=true";
    }
}
