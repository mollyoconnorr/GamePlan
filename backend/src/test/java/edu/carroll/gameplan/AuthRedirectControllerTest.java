package edu.carroll.gameplan;

import edu.carroll.gameplan.config.SecurityProps;
import edu.carroll.gameplan.controller.AuthRedirectController;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRedirectControllerTest {

    @Test
    void redirectLoginErrorFallsBackToRootQueryWhenLogoutUrlMissing() {
        SecurityProps props = new SecurityProps();
        props.setLogoutUrl(" ");
        AuthRedirectController controller = new AuthRedirectController(props);

        String redirect = controller.redirectLoginError();

        assertEquals("redirect:/?loginError=true", redirect);
    }

    @Test
    void redirectLoginErrorAppendsQuerySeparatorForPlainLogoutUrl() {
        SecurityProps props = new SecurityProps();
        props.setLogoutUrl("https://example.com/logout");
        AuthRedirectController controller = new AuthRedirectController(props);

        String redirect = controller.redirectLoginError();

        assertEquals("redirect:https://example.com/logout?loginError=true", redirect);
    }

    @Test
    void redirectLoginErrorUsesAmpersandWhenLogoutUrlAlreadyHasQuery() {
        SecurityProps props = new SecurityProps();
        props.setLogoutUrl("https://example.com/logout?post=true");
        AuthRedirectController controller = new AuthRedirectController(props);

        String redirect = controller.redirectLoginError();

        assertEquals("redirect:https://example.com/logout?post=true&loginError=true", redirect);
    }
}
