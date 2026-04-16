package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.dto.request.CreateUserRequest;
import edu.carroll.gameplan.dto.response.AdminUserResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service encapsulating administrative user management operations.
 */
@Service
public class AdminService {
    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

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
            logger.warn("Admin attempted to create user with duplicate email: email={}", email);
            throw new IllegalArgumentException("Email already in use");
        }

        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(UserRole.STUDENT);
        user.setOidcUserId(request.getOidcUserId());
        User saved = userService.saveUser(user);
        logger.info("Admin created pending user: userId={}, email={}, role={}", saved.getId(), saved.getEmail(), saved.getRole());
        return toResponse(saved);
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

        UserRole previousRole = targetUser.getRole();
        targetUser.setRole(nextRole);
        User saved = userService.saveUser(targetUser);
        logger.info(
                "Admin updated user role: userId={}, previousRole={}, newRole={}",
                saved.getId(),
                previousRole,
                saved.getRole()
        );
        return toResponse(saved);
    }

    /**
     * Counts how many pending students are waiting for approval.
     *
     * @return number of student requests
     */
    public long countPendingStudents() {
        return userService.countByRole(UserRole.STUDENT);
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
