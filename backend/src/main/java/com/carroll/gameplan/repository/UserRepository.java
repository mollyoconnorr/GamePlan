package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.User;
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
}
