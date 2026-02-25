package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

public class ReservationRequest {
    private Long equipmentId;
    private String start;
    private String end;

    // getters and setters
    public Long getEquipmentId() { return equipmentId; }
    public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }
    public String getStart() { return start; }
    public void setStart(String start) { this.start = start; }
    public String getEnd() { return end; }
    public void setEnd(String end) { this.end = end; }
}
