package edu.carroll.gameplan.model;

import jakarta.persistence.*;

import java.time.LocalTime;

/**
 * Singleton entity that stores global scheduling settings for the app.
 */
@Entity
public class AppSettings {
    /**
     * Fixed primary key for the single app settings row.
     */
    @Id
    private final Long id = 1L;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private CalendarFirstDay startDay;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private Integer timeStep;

    @Column(nullable = false)
    private Integer maxReservationTime;

    @Column(nullable = false)
    private Integer numDaysToShow;

    public AppSettings() {
        // JPA constructor.
    }

    public AppSettings(
            CalendarFirstDay startDay,
            LocalTime startTime,
            LocalTime endTime,
            Integer timeStep,
            Integer maxReservationTime,
            Integer numDaysToShow) {
        this.startDay = startDay;
        this.startTime = startTime;
        this.endTime = endTime;
        this.timeStep = timeStep;
        this.maxReservationTime = maxReservationTime;
        this.numDaysToShow = numDaysToShow;
    }

    public CalendarFirstDay getStartDay() {
        return startDay;
    }

    public void setStartDay(CalendarFirstDay startDay) {
        this.startDay = startDay;
    }

    public Long getId() {
        return id;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Integer getTimeStep() {
        return timeStep;
    }

    public void setTimeStep(Integer timeStep) {
        this.timeStep = timeStep;
    }

    public Integer getMaxReservationTime() {
        return maxReservationTime;
    }

    public void setMaxReservationTime(Integer maxReservationTime) {
        this.maxReservationTime = maxReservationTime;
    }

    public Integer getNumDaysToShow() {
        return numDaysToShow;
    }

    public void setNumDaysToShow(Integer numDaysToShow) {
        this.numDaysToShow = numDaysToShow;
    }
}
