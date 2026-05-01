package edu.carroll.gameplan.dto.request;

import java.util.Map;

/**
 * Payload used when updating the metadata of a piece of equipment.
 */
public class EquipmentUpdateRequest {

    /**
     * New name for the equipment.
     */
    private String name;
    /**
     * Identifier of the equipment type.
     */
    private Long equipmentTypeId;
    /**
     * Optional attribute map for the equipment.
     */
    private Map<String, String> attributes;

    /**
     * Request body used when editing equipment identity, type, and dynamic attributes.
     */
    public EquipmentUpdateRequest() {
    }

    /**
     * Gets the new equipment name.
     *
     * @return equipment name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the new equipment name.
     *
     * @param name equipment name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the equipment type identifier.
     *
     * @return equipment type ID
     */
    public Long getEquipmentTypeId() {
        return equipmentTypeId;
    }

    /**
     * Sets the equipment type identifier.
     *
     * @param equipmentTypeId equipment type ID
     */
    public void setEquipmentTypeId(Long equipmentTypeId) {
        this.equipmentTypeId = equipmentTypeId;
    }

    /**
     * Gets the attribute map for the equipment.
     *
     * @return attribute name-value map
     */
    public Map<String, String> getAttributes() {
        return attributes;
    }

    /**
     * Sets the attribute map for the equipment.
     *
     * @param attributes attribute name-value map
     */
    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }
}
