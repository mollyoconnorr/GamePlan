package com.carroll.gameplan;

import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setup() {
        // Create User
        testUser = new User();
        testUser.setFirstName("Jane");
        testUser.setLastName("Doe");
        testUser.setEmail("jane.doe@example.com");
        testUser.setOidcSubject("oidc-67890");
        testUser.setRole(UserRole.ATHLETE);

        testUser = userRepository.save(testUser);
    }

    @Test
    void shouldSaveAndFindUserById() {
        Optional<User> found = userRepository.findById(testUser.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getFirstName()).isEqualTo("Jane");
        assertThat(found.get().getEmail()).isEqualTo("jane.doe@example.com");
    }

    @Test
    void shouldFindUserByEmail() {
        Optional<User> found = userRepository.findByEmail("jane.doe@example.com");
        assertThat(found).isPresent();
        assertThat(found.get().getLastName()).isEqualTo("Doe");
    }

    @Test
    void shouldReturnEmptyForUnknownEmail() {
        Optional<User> notFound = userRepository.findByEmail("unknown@example.com");
        assertThat(notFound).isEmpty();
    }
}
