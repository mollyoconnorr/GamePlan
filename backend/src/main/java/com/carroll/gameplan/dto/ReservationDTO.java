package com.carroll.gameplan.dto;

import java.time.LocalDateTime;

public class ReservationDTO {

    private Long id;
    private String start;
    private String end;

    public ReservationDTO(Long id, LocalDateTime start, LocalDateTime end) {
        this.id = id;
        this.start = start.toString();
        this.end = end.toString();
    }

    // getters/setters
    public Long getId() { return id; }
    public String getStart() { return start; }
    public String getEnd() { return end; }
}