package com.carroll.gameplan.dto;

import java.util.List;

/**
 * Data Transfer Object representing a single attribute of an equipment type.
 * <p>
 * Each attribute has a name and a list of allowed options. For example:
 * <pre>
 * { name: "size", options: ["S", "M", "L"] }
 * </pre>
 * </p>
 */
public class EquipmentTypeAttributeDTO {

    /**
     * Name of the attribute (e.g., "size", "color").
     */
    private String name;

    /**
     * List of allowed options for this attribute (e.g., ["S", "M", "L"]).
     */
    private List<String> options;

    /**
     * Default constructor required by Jackson.
     */
    public EquipmentTypeAttributeDTO() {
    }

    /**
     * Convenience constructor to create an EquipmentTypeAttributeDTO.
     *
     * @param name    Name of the attribute
     * @param options Allowed options for this attribute
     */
    public EquipmentTypeAttributeDTO(String name, List<String> options) {
        this.name = name;
        this.options = options;
    }

    // ===== Getters & Setters =====

    /**
     * Gets the name of the attribute.
     *
     * @return attribute name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name of the attribute.
     *
     * @param name attribute name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the list of allowed options for this attribute.
     *
     * @return list of options
     */
    public List<String> getOptions() {
        return options;
    }

    /**
     * Sets the list of allowed options for this attribute.
     *
     * @param options list of options
     */
    public void setOptions(List<String> options) {
        this.options = options;
    }
}