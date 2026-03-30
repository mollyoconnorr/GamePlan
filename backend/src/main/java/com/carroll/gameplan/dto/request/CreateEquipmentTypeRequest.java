package com.carroll.gameplan.dto.request;

/**
 * Data Transfer Object for creating a new EquipmentType.
 * <p>
 * Contains the name of the type, optional field schema JSON, and an optional color.
 * </p>
 */
public class CreateEquipmentTypeRequest {

    /**
     * Name of the equipment type.
     */
    private String name;

    /**
     * Optional JSON schema defining attributes for this equipment type.
     */
    private String fieldSchema;

    /**
     * Optional color associated with the equipment type (e.g., for UI display).
     */
    private String color;

    /**
     * Gets the name of the equipment type.
     *
     * @return the equipment type name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name of the equipment type.
     *
     * @param name the equipment type name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the JSON field schema for this equipment type.
     *
     * @return the field schema JSON as a string
     */
    public String getFieldSchema() {
        return fieldSchema;
    }

    /**
     * Sets the JSON field schema for this equipment type.
     *
     * @param fieldSchema the field schema JSON as a string
     */
    public void setFieldSchema(String fieldSchema) {
        this.fieldSchema = fieldSchema;
    }

    /**
     * Gets the color associated with this equipment type.
     *
     * @return the color string
     */
    public String getColor() {
        return color;
    }

    /**
     * Sets the color associated with this equipment type.
     *
     * @param color the color string
     */
    public void setColor(String color) {
        this.color = color;
    }
}