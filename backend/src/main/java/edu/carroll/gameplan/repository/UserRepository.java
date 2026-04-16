package edu.carroll.gameplan.repository;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository interface for User entities.
 * <p>
 * Provides basic CRUD operations through JpaRepository
 * and custom queries for finding users by OIDC ID.
 * </p>
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a User by their unique OIDC user ID.
     *
     * @param oidcUserId the OIDC subject ID from the OAuth2 provider
     * @return an Optional containing the User if found, or empty if not
     */
    Optional<User> findByOidcUserId(String oidcUserId);

    /**
     * Finds a User by their email address (case insensitive).
     *
     * @param email the user email to search for
     * @return an Optional containing the User if found
     */
    Optional<User> findByEmailIgnoreCase(String email);

    /**
     * Checks if a user exists with the given email (case insensitive).
     *
     * @param email the email to check
     * @return true if a user exists with this email
     */
    boolean existsByEmailIgnoreCase(String email);

    long countByRole(UserRole role);

    long countByPendingApprovalTrue();
}
