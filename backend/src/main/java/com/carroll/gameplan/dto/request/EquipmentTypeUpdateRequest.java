package com.carroll.gameplan.dto.request;

public class EquipmentTypeUpdateRequest {
    private String name;
    private String fieldSchema;
    private String color;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFieldSchema() {
        return fieldSchema;
    }

    public void setFieldSchema(String fieldSchema) {
        this.fieldSchema = fieldSchema;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
