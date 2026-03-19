package com.carroll.gameplan.dto;

import java.util.Map;

/**
 * Data Transfer Object for creating a new Equipment entity.
 * <p>
 * Includes the equipment's name, type ID, and optional attributes.
 * </p>
 */
public class CreateEquipmentRequest {

    /**
     * Name of the equipment.
     */
    private String name;

    /**
     * ID of the EquipmentType this equipment belongs to.
     */
    private Long equipmentTypeId;

    /**
     * Optional map of attribute name-value pairs for the equipment.
     */
    private Map<String, String> attributes;

    /**
     * Gets the name of the equipment.
     *
     * @return Equipment name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name of the equipment.
     *
     * @param name Equipment name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the ID of the equipment type.
     *
     * @return EquipmentType ID
     */
    public Long getEquipmentTypeId() {
        return equipmentTypeId;
    }

    /**
     * Sets the ID of the equipment type.
     *
     * @param equipmentTypeId EquipmentType ID
     */
    public void setEquipmentTypeId(Long equipmentTypeId) {
        this.equipmentTypeId = equipmentTypeId;
    }

    /**
     * Gets the attributes map for the equipment.
     *
     * @return Map of attribute name-value pairs
     */
    public Map<String, String> getAttributes() {
        return attributes;
    }

    /**
     * Sets the attributes map for the equipment.
     *
     * @param attributes Map of attribute name-value pairs
     */
    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }
}