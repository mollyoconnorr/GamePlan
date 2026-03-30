package com.carroll.gameplan.dto;

/**
 * Data Transfer Object representing an Equipment Type.
 * <p>
 * Contains basic information about an equipment type including its ID, name,
 * whether it has a field schema, and an optional color for UI display.
 * </p>
 */
public class EquipmentTypeDTO {

    /**
     * Unique identifier for the equipment type.
     */
    private final Long id;

    /**
     * Name of the equipment type.
     */
    private final String name;

    /**
     * Indicates whether this equipment type has a field schema defined.
     */
    private final boolean hasSchema;

    /**
     * Optional color associated with this equipment type (e.g., for UI representation).
     */
    private final String color;

    /**
     * Raw field schema JSON, if present.
     */
    private final String fieldSchema;

    /**
     * Constructor to create an EquipmentTypeDTO.
     *
     * @param id        Unique identifier of the equipment type
     * @param name      Name of the equipment type
     * @param hasSchema True if a field schema exists
     * @param color     Optional color string
     */
    public EquipmentTypeDTO(Long id, String name, boolean hasSchema, String color, String fieldSchema) {
        this.id = id;
        this.name = name;
        this.hasSchema = hasSchema;
        this.color = color;
        this.fieldSchema = fieldSchema;
    }

    /**
     * Gets the ID of the equipment type.
     *
     * @return equipment type ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Gets the name of the equipment type.
     *
     * @return equipment type name
     */
    public String getName() {
        return name;
    }

    /**
     * Checks if this equipment type has a field schema.
     *
     * @return true if a schema exists, false otherwise
     */
    public boolean isHasSchema() {
        return hasSchema;
    }

    /**
     * Gets the color associated with this equipment type.
     *
     * @return color string, or null if none
     */
    public String getColor() {
        return color;
    }

    /**
     * Gets the raw field schema JSON for this equipment type.
     *
     * @return field schema string, or null if none
     */
    public String getFieldSchema() {
        return fieldSchema;
    }
}
