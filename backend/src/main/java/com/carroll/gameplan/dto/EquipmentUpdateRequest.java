package com.carroll.gameplan.dto;

import java.util.Map;

/**
 * Payload used when updating the metadata of a piece of equipment.
 */
public class EquipmentUpdateRequest {

    private String name;
    private Long equipmentTypeId;
    private Map<String, String> attributes;

    public EquipmentUpdateRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getEquipmentTypeId() {
        return equipmentTypeId;
    }

    public void setEquipmentTypeId(Long equipmentTypeId) {
        this.equipmentTypeId = equipmentTypeId;
    }

    public Map<String, String> getAttributes() {
        return attributes;
    }

    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }
}
