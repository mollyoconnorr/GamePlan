package com.carroll.gameplan.model;

/**
 * Enum representing the current status of a piece of equipment.
 * <ul>
 *     <li>{@link #AVAILABLE} – The equipment is available for reservation.</li>
 *     <li>{@link #RESERVED} – The equipment is currently reserved by a user.</li>
 *     <li>{@link #OUT_OF_SERVICE} – The equipment is not usable and unavailable for reservation.</li>
 *     <li>{@link #MAINTENANCE} – The equipment is under maintenance and cannot be reserved.</li>
 * </ul>
 */
public enum EquipmentStatus {
    /**
     * Equipment is available for reservation.
     */
    AVAILABLE,

    /**
     * Equipment has been reserved.
     */
    RESERVED,

    /**
     * Equipment is out of service and cannot be used.
     */
    OUT_OF_SERVICE,

    /**
     * Equipment is under maintenance.
     */
    MAINTENANCE
}
