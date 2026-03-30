package com.carroll.gameplan.dto.response;

/**
 * Data Transfer Object representing an Equipment Type.
 * <p>
 * Contains basic information about an equipment type including its ID, name,
 * whether it has a field schema, and an optional color for UI display.
 * </p>
 *
 * @param id          Unique identifier for the equipment type.
 * @param name        Name of the equipment type.
 * @param hasSchema   Indicates whether this equipment type has a field schema defined.
 * @param color       Optional color associated with this equipment type (e.g., for UI representation).
 * @param fieldSchema Raw field schema JSON, if present.
 */
public record EquipmentTypeDTO(Long id, String name, boolean hasSchema, String color, String fieldSchema) {
}
