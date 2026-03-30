package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.AdminUserResponse;
import com.carroll.gameplan.dto.CreateUserRequest;
import com.carroll.gameplan.dto.UserRoleUpdateRequest;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> getAllUsers(OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return userService.findAllUsers().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/users")
    public AdminUserResponse createUser(@RequestBody CreateUserRequest request,
                                        OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        String email = request.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (userService.emailExists(email)) {
            throw new IllegalArgumentException("Email already in use");
        }

        UserRole targetRole = UserRole.STUDENT;
        User user = new User();
        user.setEmail(email.trim());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(targetRole);
        user.setOidcUserId(request.getOidcUserId());

        User saved = userService.saveUser(user);

        return toResponse(saved);
    }

    @PostMapping("/users/{userId}/role")
    public AdminUserResponse updateUserRole(@PathVariable Long userId,
                                            @RequestBody UserRoleUpdateRequest request,
                                            OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        User targetUser = userService.getUserById(userId);

        String requestedRole = request.role();
        if (requestedRole == null || requestedRole.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        UserRole nextRole;
        try {
            nextRole = UserRole.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + requestedRole);
        }

        targetUser.setRole(nextRole);
        User saved = userService.saveUser(targetUser);

        return toResponse(saved);
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
