package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.UserController;
import edu.carroll.gameplan.dto.response.UserDto;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserControllerTest {

    private UserService userService;
    private UserController controller;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        controller = new UserController(userService);
    }

    @Test
    void getUserReturnsNotFoundWhenAuthenticationMissing() {
        ResponseEntity<UserDto> response = controller.getUser(null);

        assertEquals(HttpStatusCode.valueOf(404), response.getStatusCode());
    }

    @Test
    void getUserReturnsNotFoundWhenPrincipalMissing() {
        OAuth2AuthenticationToken authentication = mock(OAuth2AuthenticationToken.class);
        when(authentication.getPrincipal()).thenReturn(null);

        ResponseEntity<UserDto> response = controller.getUser(authentication);

        assertEquals(HttpStatusCode.valueOf(404), response.getStatusCode());
    }

    @Test
    void getUserReturnsMappedDtoWithDefaultAthleteRoleWhenRoleMissing() {
        OAuth2AuthenticationToken authentication = mock(OAuth2AuthenticationToken.class);
        OAuth2User principal = mock(OAuth2User.class);
        when(authentication.getPrincipal()).thenReturn(principal);

        User user = new User();
        user.setOidcUserId("sub-123");
        user.setEmail("user@example.com");
        user.setFirstName("First");
        user.setLastName("Last");
        user.setPendingApproval(true);
        when(userService.resolveCurrentUser(authentication)).thenReturn(user);

        ResponseEntity<UserDto> response = controller.getUser(authentication);

        assertEquals(HttpStatusCode.valueOf(200), response.getStatusCode());
        assertEquals("sub-123", response.getBody().id());
        assertEquals("user@example.com", response.getBody().email());
        assertEquals("ATHLETE", response.getBody().role());
        assertEquals(true, response.getBody().pendingApproval());
        verify(userService).resolveCurrentUser(authentication);
    }
}
