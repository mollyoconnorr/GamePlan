package com.carroll.gameplan.service;

import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Helper service for resolving the authenticated {@link User} and checking roles.
 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User resolveCurrentUser(OAuth2AuthenticationToken authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Authentication token is missing");
        }

        String oidcUserId = authentication.getPrincipal().getAttribute("sub");
        return userRepository.findByOidcUserId(oidcUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public boolean isTrainer(User user) {
        return user != null && (UserRole.AT.equals(user.getRole()) || UserRole.ADMIN.equals(user.getRole()));
    }

    public boolean isAdmin(User user) {
        return user != null && UserRole.ADMIN.equals(user.getRole());
    }

    public void requireTrainer(User user) {
        if (!isTrainer(user)) {
            throw new AccessDeniedException("Trainer or admin role required");
        }
    }

    public void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new AccessDeniedException("Admin role required");
        }
    }

    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    public boolean emailExists(String email) {
        return email != null && userRepository.existsByEmailIgnoreCase(email);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }
}
