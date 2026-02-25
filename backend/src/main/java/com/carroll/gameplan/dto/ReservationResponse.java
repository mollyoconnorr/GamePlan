package com.carroll.gameplan.dto;

public class ReservationResponse {

    private Long id;
    private String equipmentName;
    private String start; // or LocalDateTime if you want JSON to keep timestamp format
    private String end;

    // Constructor
    public ReservationResponse(Long id, String equipmentName, String start, String end) {
        this.id = id;
        this.equipmentName = equipmentName;
        this.start = start;
        this.end = end;
    }

    // Getters
    public Long getId() {
        return id;
    }

    public String getEquipmentName() {
        return equipmentName;
    }

    public String getStart() {
        return start;
    }

    public String getEnd() {
        return end;
    }

    // Setters (optional if your DTO is immutable)
    public void setId(Long id) {
        this.id = id;
    }

    public void setEquipmentName(String equipmentName) {
        this.equipmentName = equipmentName;
    }

    public void setStart(String start) {
        this.start = start;
    }

    public void setEnd(String end) {
        this.end = end;
    }
}
