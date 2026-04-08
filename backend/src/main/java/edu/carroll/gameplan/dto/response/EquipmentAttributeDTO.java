package edu.carroll.gameplan.dto.response;

import java.util.Objects;

/**
 * Data Transfer Object representing a single attribute of equipment.
 * <p>
 * Contains a name and value pair, for example: "size":"large" or "color":"red".
 * This DTO supports equality comparison for use in collections and streams.
 * </p>
 */
public class EquipmentAttributeDTO {

    /**
     * Name of the attribute (e.g., "size", "color").
     */
    private String name;

    /**
     * Value of the attribute (e.g., "large", "red").
     */
    private String value;

    /**
     * Constructor to create an EquipmentAttributeDTO.
     *
     * @param name  The attribute name
     * @param value The attribute value
     */
    public EquipmentAttributeDTO(String name, String value) {
        this.name = name;
        this.value = value;
    }

    /**
     * Gets the attribute name.
     *
     * @return Attribute name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the attribute name.
     *
     * @param name Attribute name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Gets the attribute value.
     *
     * @return Attribute value
     */
    public String getValue() {
        return value;
    }

    /**
     * Sets the attribute value.
     *
     * @param value Attribute value
     */
    public void setValue(String value) {
        this.value = value;
    }

    /**
     * Compares this DTO to another object for equality.
     * <p>
     * Used to allow distinct() operations on streams.
     *
     * @param o The object to compare
     * @return true if the objects have the same name and value
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EquipmentAttributeDTO that)) return false;
        return Objects.equals(name, that.name) &&
                Objects.equals(value, that.value);
    }

    /**
     * Returns a hash code based on the name and value.
     *
     * @return hash code
     */
    @Override
    public int hashCode() {
        return Objects.hash(name, value);
    }
}