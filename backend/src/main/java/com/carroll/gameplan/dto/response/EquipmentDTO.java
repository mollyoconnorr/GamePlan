package com.carroll.gameplan.dto.response;

import java.util.List;

/**
 * Data Transfer Object representing a piece of equipment.
 * <p>
 * Contains basic information about the equipment, including its ID, name,
 * status, type name, and a list of attributes.
 * </p>
 */
public class EquipmentDTO {

    /**
     * Unique identifier of the equipment.
     */
    private Long id;

    /**
     * Name of the equipment.
     */
    private String name;

    /**
     * Status of the equipment (e.g., AVAILABLE, RESERVED).
     */
    private String status;

    /**
     * Name of the equipment type this equipment belongs to.
     */
    private String typeName;

    private Long typeId;

    /**
     * List of attribute DTOs describing additional properties of the equipment.
     */
    private List<AttributeDTO> attributes;

    // ===== Getters & Setters =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTypeName() {
        return typeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    public Long getTypeId() {
        return typeId;
    }

    public void setTypeId(Long typeId) {
        this.typeId = typeId;
    }

    public List<AttributeDTO> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<AttributeDTO> attributes) {
        this.attributes = attributes;
    }

    // ===== Nested DTO class for attributes =====

    /**
     * Data Transfer Object representing a single attribute of equipment.
     * <p>
     * Consists of a name-value pair (e.g., "color":"red").
     * </p>
     */
    public static class AttributeDTO {

        /**
         * Name of the attribute.
         */
        private String name;

        /**
         * Value of the attribute.
         */
        private String value;

        /**
         * Gets the attribute name.
         *
         * @return the name of the attribute
         */
        public String getName() {
            return name;
        }

        /**
         * Sets the attribute name.
         *
         * @param name the name of the attribute
         */
        public void setName(String name) {
            this.name = name;
        }

        /**
         * Gets the attribute value.
         *
         * @return the value of the attribute
         */
        public String getValue() {
            return value;
        }

        /**
         * Sets the attribute value.
         *
         * @param value the value of the attribute
         */
        public void setValue(String value) {
            this.value = value;
        }
    }
}
