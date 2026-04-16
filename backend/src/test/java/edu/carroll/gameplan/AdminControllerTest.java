package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.AdminController;
import edu.carroll.gameplan.dto.request.CreateUserRequest;
import edu.carroll.gameplan.dto.request.UserRoleUpdateRequest;
import edu.carroll.gameplan.dto.response.AdminPendingCountResponse;
import edu.carroll.gameplan.dto.response.AdminUserResponse;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.AdminService;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminControllerTest {

    private AdminService adminService;
    private UserService userService;
    private AdminController controller;
    private OAuth2AuthenticationToken authentication;
    private User adminUser;

    @BeforeEach
    void setUp() {
        adminService = mock(AdminService.class);
        userService = mock(UserService.class);
        controller = new AdminController(adminService, userService);
        authentication = mock(OAuth2AuthenticationToken.class);

        adminUser = new User();
        adminUser.setId(99L);
        adminUser.setRole(UserRole.ADMIN);
        when(userService.resolveCurrentUser(authentication)).thenReturn(adminUser);
    }

    @Test
    void getAllUsersRequiresAdminAndReturnsServiceResult() {
        List<AdminUserResponse> expected = List.of(
                new AdminUserResponse(1L, "oidc-1", "a@b.com", "A", "B", "ATHLETE", false)
        );
        when(adminService.listUsers()).thenReturn(expected);

        List<AdminUserResponse> actual = controller.getAllUsers(authentication);

        assertEquals(expected, actual);
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireAdmin(adminUser);
        verify(adminService).listUsers();
    }

    @Test
    void createUserRequiresAdminAndDelegates() {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("new@user.com");
        request.setFirstName("New");
        request.setLastName("User");

        AdminUserResponse expected = new AdminUserResponse(2L, "oidc-2", "new@user.com", "New", "User", "STUDENT", true);
        when(adminService.createPendingStudent(request)).thenReturn(expected);

        AdminUserResponse actual = controller.createUser(request, authentication);

        assertEquals(expected, actual);
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireAdmin(adminUser);
        verify(adminService).createPendingStudent(request);
    }

    @Test
    void updateUserRoleRequiresAdminAndDelegates() {
        UserRoleUpdateRequest request = new UserRoleUpdateRequest("AT");
        AdminUserResponse expected = new AdminUserResponse(5L, "oidc-5", "coach@x.com", "Coach", "X", "AT", false);
        when(adminService.updateUserRole(5L, "AT", adminUser)).thenReturn(expected);

        AdminUserResponse actual = controller.updateUserRole(5L, request, authentication);

        assertEquals(expected, actual);
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireAdmin(adminUser);
        verify(adminService).updateUserRole(5L, "AT", adminUser);
    }

    @Test
    void getPendingCountRequiresAdminAndReturnsWrappedCount() {
        when(adminService.countPendingStudents()).thenReturn(7L);

        AdminPendingCountResponse actual = controller.getPendingCount(authentication);

        assertEquals(7L, actual.pending());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireAdmin(adminUser);
        verify(adminService).countPendingStudents();
    }
}
