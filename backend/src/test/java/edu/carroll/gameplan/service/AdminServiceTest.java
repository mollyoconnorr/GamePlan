package edu.carroll.gameplan.service;

import edu.carroll.gameplan.dto.response.AdminUserResponse;
import edu.carroll.gameplan.dto.request.CreateUserRequest;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import org.springframework.security.access.AccessDeniedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests covering administrative user behavior such as listing and role updates.
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private AdminService adminService;

    /**
     * Validates that {@link AdminService#listUsers()} returns DTOs for every user.
     */
    @Test
    void listUsersReturnsResponses() {
        User user = new User();
        user.setRole(UserRole.ATHLETE);
        when(userService.findAllUsers()).thenReturn(List.of(user));

        List<AdminUserResponse> responses = adminService.listUsers();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).role()).isEqualTo(UserRole.ATHLETE.name());
        assertThat(responses.get(0).pendingApproval()).isFalse();
    }

    /**
     * Ensures duplicate emails trigger an error when creating a pending student.
     */
    @Test
    void createPendingStudentValidatesDuplicateEmail() {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("test@example.com");
        when(userService.emailExists("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> adminService.createPendingStudent(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already in use");
    }

    /**
     * Verifies that invalid role names are rejected when updating a user.
     */
    @Test
    void updateUserRoleThrowsForInvalidRole() {
        when(userService.getUserById(1L)).thenReturn(new User());

        assertThatThrownBy(() -> adminService.updateUserRole(1L, "invalid", new User()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid role");
    }

    /**
     * Confirms a new student is created when the email is free.
     */
    @Test
    void createPendingStudentSavesNewStudent() {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("new@example.com");
        request.setFirstName("New");
        request.setLastName("User");
        request.setOidcUserId("oidc-1");
        when(userService.emailExists("new@example.com")).thenReturn(false);
        lenient().when(userService.saveUser(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AdminUserResponse response = adminService.createPendingStudent(request);

        assertThat(response.email()).isEqualTo("new@example.com");
        assertThat(response.role()).isEqualTo(UserRole.STUDENT.name());
        assertThat(response.pendingApproval()).isTrue();
    }

    /**
     * Checks that a valid role string is persisted on the user.
     */
    @Test
    void updateUserRoleAppliesValidRole() {
        User user = new User();
        user.setRole(UserRole.ATHLETE);
        user.setAuthVersion(4L);
        when(userService.getUserById(2L)).thenReturn(user);
        when(userService.saveUser(user)).thenReturn(user);

        AdminUserResponse response = adminService.updateUserRole(2L, "admin", new User());

        assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(user.getAuthVersion()).isEqualTo(5L);
        assertThat(response.role()).isEqualTo(UserRole.ADMIN.name());
    }

    /**
     * Confirms the student role can be restored through the generic role updater.
     */
    @Test
    void updateUserRoleCanRestoreStudentRole() {
        User user = new User();
        user.setRole(UserRole.ADMIN);
        user.setAuthVersion(8L);
        when(userService.getUserById(3L)).thenReturn(user);
        when(userService.saveUser(user)).thenReturn(user);

        AdminUserResponse response = adminService.updateUserRole(3L, "student", new User());

        assertThat(user.getRole()).isEqualTo(UserRole.STUDENT);
        assertThat(user.getAuthVersion()).isEqualTo(9L);
        assertThat(response.role()).isEqualTo(UserRole.STUDENT.name());
        assertThat(response.pendingApproval()).isFalse();
    }

    /**
     * Prevents admins from changing their own role.
     */
    @Test
    void updateUserRoleRejectsSelfChange() {
        User admin = new User();
        admin.setId(99L);
        admin.setRole(UserRole.ADMIN);

        assertThatThrownBy(() -> adminService.updateUserRole(99L, "athlete", admin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Admins cannot change their own role");
    }
}
