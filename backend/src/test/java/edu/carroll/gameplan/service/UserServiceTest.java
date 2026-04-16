package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the helper {@link UserService} methods around role checks and lookups.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    /**
     * Verifies trainers and admins are treated as trainers.
     */
    @Test
    void isTrainerReturnsTrueForAtOrAdmin() {
        User admin = new User();
        admin.setRole(UserRole.ADMIN);
        User trainer = new User();
        trainer.setRole(UserRole.AT);

        assertThat(userService.isTrainer(admin)).isTrue();
        assertThat(userService.isTrainer(trainer)).isTrue();
    }

    /**
     * Ensures non-trainers cannot pass the trainer guard.
     */
    @Test
    void requireTrainerThrowsForAthlete() {
        User athlete = new User();
        athlete.setRole(UserRole.ATHLETE);

        assertThatThrownBy(() -> userService.requireTrainer(athlete)).hasMessageContaining("Trainer");
    }

    /**
     * Confirms only admins satisfy the admin guard.
     */
    @Test
    void requireAdminThrowsForNonAdmin() {
        User user = new User();
        user.setRole(UserRole.AT);

        assertThatThrownBy(() -> userService.requireAdmin(user)).hasMessageContaining("Admin");
    }

    /**
     * Allows admin users to pass the guard without exception.
     */
    @Test
    void requireAdminAllowsAdmin() {
        User admin = new User();
        admin.setRole(UserRole.ADMIN);

        assertThatCode(() -> userService.requireAdmin(admin)).doesNotThrowAnyException();
    }

    /**
     * Checks email existence is delegated to the repository.
     */
    @Test
    void emailExistsDelegatesToRepository() {
        when(userRepository.existsByEmailIgnoreCase("foo@example.com")).thenReturn(true);

        assertThat(userService.emailExists("foo@example.com")).isTrue();
    }

    /**
     * Rejects stale sessions when the stored auth version no longer matches.
     */
    @Test
    void resolveCurrentUserRejectsStaleAuthVersion() {
        User user = new User();
        user.setOidcUserId("sub-1");
        user.setAuthVersion(2L);
        when(userRepository.findByOidcUserId("sub-1")).thenReturn(java.util.Optional.of(user));

        OAuth2AuthenticationToken authentication = org.mockito.Mockito.mock(OAuth2AuthenticationToken.class);
        OidcUser principal = org.mockito.Mockito.mock(OidcUser.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(principal.getAttribute("sub")).thenReturn("sub-1");
        when(principal.getAttribute(VersionedOidcUser.AUTH_VERSION_ATTRIBUTE)).thenReturn(1L);

        assertThatThrownBy(() -> userService.resolveCurrentUser(authentication))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * Allows current sessions through when the auth version still matches.
     */
    @Test
    void resolveCurrentUserAllowsMatchingAuthVersion() {
        User user = new User();
        user.setOidcUserId("sub-1");
        user.setAuthVersion(2L);
        when(userRepository.findByOidcUserId("sub-1")).thenReturn(java.util.Optional.of(user));

        OAuth2AuthenticationToken authentication = org.mockito.Mockito.mock(OAuth2AuthenticationToken.class);
        OidcUser principal = org.mockito.Mockito.mock(OidcUser.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(principal.getAttribute("sub")).thenReturn("sub-1");
        when(principal.getAttribute(VersionedOidcUser.AUTH_VERSION_ATTRIBUTE)).thenReturn(2L);

        assertThatCode(() -> userService.resolveCurrentUser(authentication)).doesNotThrowAnyException();
    }
}
