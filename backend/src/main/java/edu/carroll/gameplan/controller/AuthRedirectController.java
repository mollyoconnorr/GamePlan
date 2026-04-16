package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.config.SecurityProps;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Redirects auth-related framework paths to frontend routes.
 */
@Controller
public class AuthRedirectController {

    private final SecurityProps securityProps;

    public AuthRedirectController(
            @Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps securityProps
    ) {
        this.securityProps = securityProps;
    }

    @GetMapping("/login/error")
    public String redirectLoginError() {
        return "redirect:" + buildLoginFailureRedirectUrl(securityProps.getLogoutUrl());
    }

    private String buildLoginFailureRedirectUrl(String logoutUrl) {
        if (logoutUrl == null || logoutUrl.isBlank()) {
            return "/?loginError=true";
        }

        final String separator = logoutUrl.contains("?") ? "&" : "?";
        return logoutUrl + separator + "loginError=true";
    }
}
