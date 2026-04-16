package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

/**
 * Custom OIDC User Service to handle new users from an OIDC provider.
 * <p>
 * When a user logs in via OAuth2/OIDC, this service ensures that the user exists
 * in the local database. If not, it creates a new user with default values.
 * </p>
 */
@Service
public class CustomOidcUserService extends OidcUserService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Loads an OIDC user from the authentication request.
     * If the user does not exist in the database, creates a new one with default role.
     *
     * @param userRequest the OIDC user request
     * @return the loaded OidcUser
     * @throws OAuth2AuthenticationException if there is an error loading the user
     */
    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // Load the user info from the OIDC provider
        OidcUser oidcUser = super.loadUser(userRequest);

        String oidcUserId = oidcUser.getSubject();
        String email = oidcUser.getEmail();
        String firstName = oidcUser.getGivenName();
        String lastName = oidcUser.getFamilyName();

        User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseGet(() -> {
                    User precreated = null;
                    if (email != null) {
                        precreated = userRepository.findByEmailIgnoreCase(email).orElse(null);
                    }
                    if (precreated != null) {
                        precreated.setOidcUserId(oidcUserId);
                        return precreated;
                    }
                    User newUser = new User();
                    newUser.setOidcUserId(oidcUserId);
                    newUser.setEmail(email);
                    newUser.setRole(UserRole.STUDENT);
                    newUser.setPendingApproval(true);
                    return newUser;
                });

        user.setFirstName(firstName);
        user.setLastName(lastName);
        if (user.getOidcUserId() == null) {
            user.setOidcUserId(oidcUserId);
        }

        user = userRepository.save(user);
        return new VersionedOidcUser(oidcUser, user.getAuthVersion());
    }
}
