package com.carroll.gameplan.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String oidcUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.ATHLETE;

    private String email;
    private String firstName;
    private String lastName;

    private LocalDateTime createdAt = LocalDateTime.now();

    // GETTERS & SETTERS

    public void setId(Long Id) {
        this.id= Id;
    }

    public Long getId() {
        return id;
    }

    public String getOidcUserId() {
        return oidcUserId;
    }

    public void setOidcUserId(String oidcUserId) {
        this.oidcUserId = oidcUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
