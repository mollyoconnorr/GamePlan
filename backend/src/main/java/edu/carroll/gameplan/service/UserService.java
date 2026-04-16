package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Helper service for resolving the authenticated {@link User} and checking roles.
 */
@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Looks up the authenticated user by their Okta subject claim.
     *
     * @param authentication OAuth2 token provided by Spring Security
     * @return resolved user entity
     */
    public User resolveCurrentUser(OAuth2AuthenticationToken authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            logger.warn("User resolution failed: authentication token missing");
            throw new RuntimeException("Authentication token is missing");
        }
        OAuth2User principal = authentication.getPrincipal();
        String oidcUserId = principal.getAttribute("sub");
        User user = userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> {
                    logger.warn("User resolution failed: no user found for oidcUserId={}", oidcUserId);
                    return new RuntimeException("User not found");
                });

        long sessionAuthVersion = getSessionAuthVersion(principal);
        if (sessionAuthVersion != user.getAuthVersion()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your role changed. Please sign in again.");
        }

        return user;
    }

    private long getSessionAuthVersion(OAuth2User principal) {
        Object authVersion = principal.getAttribute(VersionedOidcUser.AUTH_VERSION_ATTRIBUTE);
        if (authVersion instanceof Number number) {
            return number.longValue();
        }
        return 0L;
    }

    /**
     * Returns true if the provided user is an athletic trainer or admin.
     *
     * @param user candidate user
     * @return true if trainer role is present
     */
    public boolean isTrainer(User user) {
        return user != null && (UserRole.AT.equals(user.getRole()) || UserRole.ADMIN.equals(user.getRole()));
    }

    /**
     * Returns true if the user has the admin role.
     *
     * @param user candidate user
     * @return true if admin
     */
    public boolean isAdmin(User user) {
        return user != null && UserRole.ADMIN.equals(user.getRole());
    }

    /**
     * Throws {@link AccessDeniedException} unless the user is a trainer or admin.
     *
     * @param user candidate user
     */
    public void requireTrainer(User user) {
        if (!isTrainer(user)) {
            logger.warn(
                    "Trainer access denied: userId={}, role={}",
                    user != null ? user.getId() : null,
                    user != null ? user.getRole() : null
            );
            throw new AccessDeniedException("Trainer or admin role required");
        }
    }

    /**
     * Throws {@link AccessDeniedException} unless the user is an admin.
     *
     * @param user candidate user
     */
    public void requireAdmin(User user) {
        if (!isAdmin(user)) {
            logger.warn(
                    "Admin access denied: userId={}, role={}",
                    user != null ? user.getId() : null,
                    user != null ? user.getRole() : null
            );
            throw new AccessDeniedException("Admin role required");
        }
    }

    /**
     * Fetches every known user record.
     *
     * @return list of users
     */
    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Checks if a user already exists with the indicated email.
     *
     * @param email email address to check
     * @return true if a user exists with the email
     */
    public boolean emailExists(String email) {
        return email != null && userRepository.existsByEmailIgnoreCase(email);
    }

    /**
     * Retrieves a user by their database ID, throwing an exception if not found.
     *
     * @param id database identifier
     * @return matching user
     */
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    /**
     * Persists the provided user entity.
     *
     * @param user user entity to save
     * @return saved instance
     */
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    /**
     * Counts how many users currently have the requested role.
     *
     * @param role target role
     * @return count of users with that role
     */
    public long countByRole(UserRole role) {
        return userRepository.countByRole(role);
    }

    /**
     * Counts how many users are pending approval.
     *
     * @return number of pending users
     */
    public long countPendingApproval() {
        return userRepository.countByPendingApprovalTrue();
    }
}
