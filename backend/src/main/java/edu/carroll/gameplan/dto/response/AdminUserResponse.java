package edu.carroll.gameplan.dto.response;

/**
 * DTO returned on admin user listings summarizing identity and role state.
 *
 * @param id         Unique identifier for the user record
 * @param oidcUserId Okta subject identifier
 * @param email      User email address
 * @param firstName  User first name
 * @param lastName   User last name
 * @param role       Current user role label
 * @param pendingApproval Whether the user is still waiting for approval
 */
public record AdminUserResponse(
        Long id,
        String oidcUserId,
        String email,
        String firstName,
        String lastName,
        String role,
        boolean pendingApproval
) {
}
