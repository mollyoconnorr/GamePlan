package edu.carroll.gameplan.dto.response;

/**
 * User summary returned to API clients.
 *
 * @param id the user identifier
 * @param email the user email address
 * @param username the OIDC subject or username
 * @param firstName the user's first name
 * @param lastName the user's last name
 * @param role the application role
 * @param pendingApproval whether the user still needs approval
 */
public record UserDto(
        String id,
        String email,
        String username,
        String firstName,
        String lastName,
        String role,
        boolean pendingApproval
) {
}
