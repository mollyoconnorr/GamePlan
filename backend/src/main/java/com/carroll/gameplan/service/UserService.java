
package com.carroll.gameplan.service;

import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * UserService
 *
 * This service handles all business logic related to users in the GamePlan application.
 * It provides methods to:
 *   - Find users by email or OIDC subject ID
 *   - Create new users with default role ATHLETE
 *   - Automatically persist users on first login via OIDC
 *   - Update user roles (ATHLETE or AT)
 *
 * The service ensures proper integration with the UserRepository and maintains
 * consistency with the User entity, including automatically managed timestamps.
 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Find a user by email
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Find a user by OIDC subject
     */
    public Optional<User> findByOidcSubject(String oidcSubject) {
        return userRepository.findByOidcSubject(oidcSubject);
    }

    /**
     * Create a new user with the specified details
     * Default role: ATHLETE
     */
    public User createUser(String email, String oidcSubject, String firstName, String lastName) {
        User user = new User();
        user.setEmail(email);
        user.setOidcSubject(oidcSubject);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        // Default role for new users
        user.setRole(UserRole.ATHLETE);
        return userRepository.save(user);
    }

    /**
     * Find user by OIDC subject or create a new one if not exists
     * Useful when logging in via Okta
     */
    public User findOrCreateUser(String email, String oidcSubject, String firstName, String lastName) {
        return findByOidcSubject(oidcSubject)
                .orElseGet(() -> createUser(email, oidcSubject, firstName, lastName));
    }

    /**
     * Update user role
     */
    public User updateUserRole(User user, UserRole role) {
        user.setRole(role);
        return userRepository.save(user);
    }
}