package com.carroll.gameplan.dto;

/**
 * Request payload used to change a user's role.
 *
 * @param role New role label to apply to the user
 */
public record UserRoleUpdateRequest(String role) {
}
