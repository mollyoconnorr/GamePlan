package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Query
    Optional<User> findByEmail(String email);

    // Find by OIDC subject ID
    Optional<User> findByOidcSubject(String oidcSubject);
}
