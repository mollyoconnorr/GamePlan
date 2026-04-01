package com.carroll.gameplan.dto;

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

    /**
     * Constructor to create an EquipmentTypeDTO.
     *
     * @param id        Unique identifier of the equipment type
     * @param name      Name of the equipment type
     * @param hasSchema True if a field schema exists
     * @param color     Optional color string
     */
    public EquipmentTypeDTO {
    }

    /**
     * Gets the ID of the equipment type.
     *
     * @return equipment type ID
     */
    @Override
    public Long id() {
        return id;
    }

    /**
     * Gets the name of the equipment type.
     *
     * @return equipment type name
     */
    @Override
    public String name() {
        return name;
    }

    /**
     * Checks if this equipment type has a field schema defined.
     *
     * @return true if a schema exists, false otherwise
     */
    @Override
    public boolean hasSchema() {
        return hasSchema;
    }

    /**
     * Gets the color associated with this equipment type.
     *
     * @return color string, or null if none
     */
    @Override
    public String color() {
        return color;
    }

    /**
     * Gets the raw field schema JSON for this equipment type.
     *
     * @return field schema string, or null if none
     */
    @Override
    public String fieldSchema() {
        return fieldSchema;
    }
}
