package com.carroll.gameplan.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
public class EquipmentType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // Stores JSON schema from your ERD
    @Column(columnDefinition = "json")
    private String fieldSchema;

    @OneToMany(mappedBy = "equipmentType")
    private List<Equipment> equipmentList;

    public EquipmentType() {}

    public EquipmentType(String name, String fieldSchema) {
        this.name = name;
        this.fieldSchema = fieldSchema;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getFieldSchema() { return fieldSchema; }

    public void setName(String name) { this.name = name; }
    public void setFieldSchema(String fieldSchema) { this.fieldSchema = fieldSchema; }
}
