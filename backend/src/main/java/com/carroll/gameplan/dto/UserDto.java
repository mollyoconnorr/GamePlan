package com.carroll.gameplan.dto;

/**
 * Data Transfer Object (DTO) representing a user.
 * <p>
 * Used to send user information between layers (e.g., from backend to frontend)
 * without exposing the entire User entity.
 * </p>
 *
 * @param id        The unique identifier of the user.
 * @param email     The user's email address.
 * @param username  The user's username or OIDC subject.
 * @param firstName The user's first name.
 * @param lastName  The user's last name.
 * @param role      The role of the user (e.g., ATHLETE, ADMIN).
 */
public record UserDto(
        String id,
        String email,
        String username,
        String firstName,
        String lastName,
        String role
) {
}
