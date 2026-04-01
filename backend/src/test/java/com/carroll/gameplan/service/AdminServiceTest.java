package com.carroll.gameplan.service;

import com.carroll.gameplan.dto.AdminUserResponse;
import com.carroll.gameplan.dto.CreateUserRequest;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
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

@ExtendWith(MockitoExtension.class)
/**
 * Unit tests covering administrative user behavior such as listing and role updates.
 */
class AdminServiceTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private AdminService adminService;

    @Test
    /**
     * Validates that {@link AdminService#listUsers()} returns DTOs for every user.
     */
    void listUsersReturnsResponses() {
        User user = new User();
        user.setRole(UserRole.ATHLETE);
        when(userService.findAllUsers()).thenReturn(List.of(user));

        List<AdminUserResponse> responses = adminService.listUsers();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).role()).isEqualTo(UserRole.ATHLETE.name());
    }

    @Test
    /**
     * Ensures duplicate emails trigger an error when creating a pending student.
     */
    void createPendingStudentValidatesDuplicateEmail() {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("test@example.com");
        when(userService.emailExists("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> adminService.createPendingStudent(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    /**
     * Verifies that invalid role names are rejected when updating a user.
     */
    void updateUserRoleThrowsForInvalidRole() {
        when(userService.getUserById(1L)).thenReturn(new User());

        assertThatThrownBy(() -> adminService.updateUserRole(1L, "invalid"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid role");
    }

    @Test
    /**
     * Confirms a new student is created when the email is free.
     */
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
    }

    @Test
    /**
     * Checks that a valid role string is persisted on the user.
     */
    void updateUserRoleAppliesValidRole() {
        User user = new User();
        user.setRole(UserRole.ATHLETE);
        when(userService.getUserById(2L)).thenReturn(user);
        when(userService.saveUser(user)).thenReturn(user);

        AdminUserResponse response = adminService.updateUserRole(2L, "admin");

        assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(response.role()).isEqualTo(UserRole.ADMIN.name());
    }
}
