package com.carroll.gameplan.dto;

import java.util.Objects;

public class EquipmentAttributeDTO {

    private String name;
    private String value;

    public EquipmentAttributeDTO() {}

    public EquipmentAttributeDTO(String name, String value) {
        this.name = name;
        this.value = value;
    }

    // getters/setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    // For distinct() in streams
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EquipmentAttributeDTO)) return false;
        EquipmentAttributeDTO that = (EquipmentAttributeDTO) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, value);
    }
}