package com.carroll.gameplan.dto;

public record AdminUserResponse(
        Long id,
        String oidcUserId,
        String email,
        String firstName,
        String lastName,
        String role
) {
}
