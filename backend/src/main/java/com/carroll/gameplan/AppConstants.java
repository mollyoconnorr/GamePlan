package com.carroll.gameplan;

/**
 * Shared constraints used when validating application settings.
 */
public final class AppConstants {
    /**
     * Minimum number of days shown in the schedule view.
     */
    public static final int MIN_DAYS_TO_SHOW = 1;

    /**
     * Maximum number of days shown in the schedule view.
     */
    public static final int MAX_DAYS_TO_SHOW = 30;

    /**
     * Smallest supported reservation increment in minutes.
     */
    public static final int MIN_TIME_STEP_MINUTES = 15;

    private AppConstants() {
        // Utility class.
    }
}
