package com.carroll.gameplan.model;

import jakarta.persistence.*;

import java.util.List;

/**
 * Represents a type or category of equipment in the system.
 * Each {@link EquipmentType} can have multiple {@link Equipment} items associated with it.
 * The {@code fieldSchema} stores a JSON schema defining properties of this equipment type.
 */
@Entity
public class EquipmentType {

    /**
     * Primary key for the equipment type.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The unique name of the equipment type (e.g., "Basketball Hoop").
     */
    @Column(nullable = false, unique = true)
    private String name;

    /**
     * JSON schema representing fields or attributes of this equipment type.
     * Example: {"height": "int", "material": "string"}.
     */
    @Column(columnDefinition = "json")
    private String fieldSchema;

    /**
     * List of equipment items that belong to this equipment type.
     */
    @OneToMany(mappedBy = "equipmentType")
    private List<Equipment> equipmentList;

    /**
     * Default constructor required by JPA.
     */
    public EquipmentType() {
    }

    /**
     * Constructor to create an equipment type with a name and JSON field schema.
     *
     * @param name        The unique name of the equipment type.
     * @param fieldSchema JSON schema representing its fields.
     */
    public EquipmentType(String name, String fieldSchema) {
        this.name = name;
        this.fieldSchema = fieldSchema;
    }

    // ===== Getters =====

    /**
     * Gets the ID of the equipment type.
     *
     * @return the equipment type ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Gets the name of the equipment type.
     *
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name of the equipment type.
     *
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }

    // ===== Setters =====

    /**
     * Gets the JSON field schema of the equipment type.
     *
     * @return the JSON schema string
     */
    public String getFieldSchema() {
        return fieldSchema;
    }

    /**
     * Sets the JSON field schema for the equipment type.
     *
     * @param fieldSchema JSON schema string
     */
    public void setFieldSchema(String fieldSchema) {
        this.fieldSchema = fieldSchema;
    }

    /**
     * Gets the list of equipment items associated with this type.
     *
     * @return list of equipment
     */
    public List<Equipment> getEquipmentList() {
        return equipmentList;
    }

    /**
     * Sets the list of equipment items for this type.
     *
     * @param equipmentList list of equipment
     */
    public void setEquipmentList(List<Equipment> equipmentList) {
        this.equipmentList = equipmentList;
    }
}
