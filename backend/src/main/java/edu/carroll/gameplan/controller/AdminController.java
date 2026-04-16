package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.response.AdminPendingCountResponse;
import edu.carroll.gameplan.dto.response.AdminUserResponse;
import edu.carroll.gameplan.dto.request.CreateUserRequest;
import edu.carroll.gameplan.dto.request.UserRoleUpdateRequest;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.AdminService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller used by admins to manage users and their roles.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;

    /**
     * @param adminService service for admin operations
     * @param userService  service for user lookup and role enforcement
     */
    public AdminController(AdminService adminService, UserService userService) {
        this.adminService = adminService;
        this.userService = userService;
    }

    /**
     * Returns every persisted user for the admin UI.
     */
    @GetMapping("/users")
    public List<AdminUserResponse> getAllUsers(OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return adminService.listUsers();
    }

    /**
     * Creates a pending student record when admins approve a new person.
     */
    @PostMapping("/users")
    public AdminUserResponse createUser(@RequestBody CreateUserRequest request,
                                        OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return adminService.createPendingStudent(request);
    }

    /**
     * Updates the application role for an existing user; the supplied string must match an enum.
     */
    @PostMapping("/users/{userId}/role")
    public AdminUserResponse updateUserRole(@PathVariable Long userId,
                                            @RequestBody UserRoleUpdateRequest request,
                                            OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return adminService.updateUserRole(userId, request.role(), currentUser);
    }

    /**
     * Provides a count of how many pending student requests exist.
     */
    @GetMapping("/users/pending-count")
    public AdminPendingCountResponse getPendingCount(OAuth2AuthenticationToken authentication) {
        User currentUser = userService.resolveCurrentUser(authentication);
        userService.requireAdmin(currentUser);

        return new AdminPendingCountResponse(adminService.countPendingStudents());
    }
}
