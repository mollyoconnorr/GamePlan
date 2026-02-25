package com.carroll.gameplan.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Represents a user of the GamePlan system.
 * <p>
 * Each user is associated with an OIDC identity, has a role (default ATHLETE),
 * and optional profile information such as email, first name, and last name.
 * </p>
 */
@Entity
@Table(name = "users")
public class User {

    /** Primary key for the user entity */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique identifier from the OIDC provider */
    @Column(unique = true)
    private String oidcUserId;

    /** Role of the user in the system; defaults to ATHLETE */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.ATHLETE;

    /** Email of the user */
    private String email;

    /** First name of the user */
    private String firstName;

    /** Last name of the user */
    private String lastName;

    /** Timestamp for when the user was created */
    private LocalDateTime createdAt = LocalDateTime.now();

    // =================== GETTERS & SETTERS ===================

    /**
     * Sets the database ID of the user.
     *
     * @param id database-generated user ID
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Returns the database ID of the user.
     *
     * @return user ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Returns the user's OIDC provider ID.
     *
     * @return OIDC user ID
     */
    public String getOidcUserId() {
        return oidcUserId;
    }

    /**
     * Sets the user's OIDC provider ID.
     *
     * @param oidcUserId OIDC user ID
     */
    public void setOidcUserId(String oidcUserId) {
        this.oidcUserId = oidcUserId;
    }

    /**
     * Returns the user's email address.
     *
     * @return email address
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the user's email address.
     *
     * @param email email address
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Returns the user's first name.
     *
     * @return first name
     */
    public String getFirstName() {
        return firstName;
    }

    /**
     * Sets the user's first name.
     *
     * @param firstName first name
     */
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    /**
     * Returns the user's last name.
     *
     * @return last name
     */
    public String getLastName() {
        return lastName;
    }

    /**
     * Sets the user's last name.
     *
     * @param lastName last name
     */
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    /**
     * Returns the timestamp when the user was created.
     *
     * @return creation timestamp
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Sets the creation timestamp.
     *
     * @param createdAt creation timestamp
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Returns the user's role in the system.
     *
     * @return user role
     */
    public UserRole getRole() {
        return role;
    }

    /**
     * Sets the user's role in the system.
     *
     * @param role user role
     */
    public void setRole(UserRole role) {
        this.role = role;
    }
}
