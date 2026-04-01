package com.carroll.gameplan.service;

import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void isTrainerReturnsTrueForAtOrAdmin() {
        User admin = new User();
        admin.setRole(UserRole.ADMIN);
        User trainer = new User();
        trainer.setRole(UserRole.AT);

        assertThat(userService.isTrainer(admin)).isTrue();
        assertThat(userService.isTrainer(trainer)).isTrue();
    }

    @Test
    void requireTrainerThrowsForAthlete() {
        User athlete = new User();
        athlete.setRole(UserRole.ATHLETE);

        assertThatThrownBy(() -> userService.requireTrainer(athlete)).hasMessageContaining("Trainer");
    }

    @Test
    void requireAdminThrowsForNonAdmin() {
        User user = new User();
        user.setRole(UserRole.AT);

        assertThatThrownBy(() -> userService.requireAdmin(user)).hasMessageContaining("Admin");
    }

    @Test
    void requireAdminAllowsAdmin() {
        User admin = new User();
        admin.setRole(UserRole.ADMIN);

        assertThatCode(() -> userService.requireAdmin(admin)).doesNotThrowAnyException();
    }

    @Test
    void emailExistsDelegatesToRepository() {
        when(userRepository.existsByEmailIgnoreCase("foo@example.com")).thenReturn(true);

        assertThat(userService.emailExists("foo@example.com")).isTrue();
    }
}
