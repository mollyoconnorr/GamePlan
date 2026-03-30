package com.carroll.gameplan.model;

/**
 * Enum representing the roles a User can have in the system.
 * <p>
 * - ADMIN: System administrator with full access.
 * - AT: Trainer/athletic trainer who manages reservations and equipment.
 * - ATHLETE: Default user role used for athletes.
 * </p>
 */
public enum UserRole {
    /**
     * Admin with the highest level of access.
     */
    ADMIN,

    /**
     * Athletic trainer who can manage reservations and equipment.
     */
    AT,

    /**
     * Default athlete role.
     */
    ATHLETE,

    /**
     * Newly signed-up user waiting for approval.
     */
    STUDENT
}
