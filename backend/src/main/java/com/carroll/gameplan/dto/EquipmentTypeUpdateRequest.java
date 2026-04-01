package com.carroll.gameplan.dto;

/**
 * DTO used to update metadata for an equipment type.
 */
public class EquipmentTypeUpdateRequest {

    /**
     * New name for the equipment type.
     */
    private String name;
    /**
     * Updated field schema JSON.
     */
    private String fieldSchema;
    /**
     * Updated color value.
     */
    private String color;

    /**
     * Gets the new name.
     *
     * @return equipment type name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the new name.
     *
     * @param name equipment type name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the updated field schema JSON.
     *
     * @return schema JSON string
     */
    public String getFieldSchema() {
        return fieldSchema;
    }

    /**
     * Sets the updated field schema JSON.
     *
     * @param fieldSchema schema JSON string
     */
    public void setFieldSchema(String fieldSchema) {
        this.fieldSchema = fieldSchema;
    }

    /**
     * Gets the updated color value.
     *
     * @return color string
     */
    public String getColor() {
        return color;
    }

    /**
     * Sets the updated color value.
     *
     * @param color color string
     */
    public void setColor(String color) {
        this.color = color;
    }
}
