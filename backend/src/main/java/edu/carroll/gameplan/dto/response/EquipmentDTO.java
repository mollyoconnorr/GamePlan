package edu.carroll.gameplan.dto.response;

import java.util.List;

/**
 * Equipment summary returned to the frontend.
 *
 * <p>This DTO includes the equipment identity, human-readable type details,
 * current status, and the dynamic attribute list used by the UI.</p>
 */
public class EquipmentDTO {

    /**
     * Unique identifier of the equipment.
     */
    private Long id;

    /**
     * Equipment display name.
     */
    private String name;

    /**
     * Current status label for the equipment (AVAILABLE, etc.).
     */
    private String status;

    /**
     * Human-readable name of the equipment type.
     */
    private String typeName;

    /**
     * Identifier of the equipment type.
     */
    private Long typeId;

    /**
     * Attribute list describing equipment properties.
     */
    private List<AttributeDTO> attributes;

    // ===== Getters & Setters =====

    /**
     * Gets the equipment identifier.
     *
     * @return equipment ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the equipment identifier.
     *
     * @param id equipment ID
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Gets the equipment name.
     *
     * @return equipment name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the equipment name.
     *
     * @param name equipment name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the equipment status.
     *
     * @return status string
     */
    public String getStatus() {
        return status;
    }

    /**
     * Sets the equipment status.
     *
     * @param status status string
     */
    public void setStatus(String status) {
        this.status = status;
    }

    /**
     * Gets the equipment type name.
     *
     * @return type name
     */
    public String getTypeName() {
        return typeName;
    }

    /**
     * Sets the equipment type name.
     *
     * @param typeName type name
     */
    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    /**
     * Gets the equipment type identifier.
     *
     * @return type ID
     */
    public Long getTypeId() {
        return typeId;
    }

    /**
     * Sets the equipment type identifier.
     *
     * @param typeId type ID
     */
    public void setTypeId(Long typeId) {
        this.typeId = typeId;
    }

    /**
     * Gets the attribute list.
     *
     * @return list of attribute DTOs
     */
    public List<AttributeDTO> getAttributes() {
        return attributes;
    }

    /**
     * Sets the attribute list.
     *
     * @param attributes list of attribute DTOs
     */
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
