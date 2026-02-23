package com.carroll.gameplan.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users") // "user" can be reserved in some DBs
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email must be unique for login reference
    @Column(nullable = false, unique = true)
    private String email;

    // OIDC subject ID, provided by okta
    @Column(nullable = false, unique = true)
    private String oidcSubject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // One user can have many reservations
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Reservation> reservations;

    // Automatically set timestamps
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ===== Constructors =====

    public User() {}

    public User(String email, String oidcSubject, UserRole role, String firstName, String lastName) {
        this.email = email;
        this.oidcSubject = oidcSubject;
        this.role = role;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    // ===== Getters & Setters =====

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getOidcSubject() {
        return oidcSubject;
    }

    public UserRole getRole() {
        return role;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setOidcSubject(String oidcSubject) {
        this.oidcSubject = oidcSubject;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
}
