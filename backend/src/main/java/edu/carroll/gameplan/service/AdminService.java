package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.dto.request.CreateUserRequest;
import edu.carroll.gameplan.dto.response.AdminUserResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service encapsulating administrative user management operations.
 */
@Service
public class AdminService {

    private final UserService userService;

    public AdminService(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns every known user in the system formatted for admin screens.
     */
    public List<AdminUserResponse> listUsers() {
        return userService.findAllUsers().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a pending student record when approving someone via Okta.
     */
    public AdminUserResponse createPendingStudent(CreateUserRequest request) {
        String email = requireEmail(request.getEmail());
        if (userService.emailExists(email)) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(UserRole.STUDENT);
        user.setOidcUserId(request.getOidcUserId());

        return toResponse(userService.saveUser(user));
    }

    /**
     * Updates the role for an existing user.
     */
    public AdminUserResponse updateUserRole(Long userId, String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        User targetUser = userService.getUserById(userId);
        UserRole nextRole;
        try {
            nextRole = UserRole.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + requestedRole);
        }

        targetUser.setRole(nextRole);
        return toResponse(userService.saveUser(targetUser));
    }

    private String requireEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        return email.trim();
    }

    private AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getOidcUserId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole() != null ? user.getRole().name() : UserRole.ATHLETE.name()
        );
    }
}
