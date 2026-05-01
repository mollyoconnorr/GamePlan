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

    @Column(nullable = false)
    private Boolean weekendAutoBlockEnabled = false;

    /**
     * Creates an AppSettings entity with the default calendar and reservation constraints.
     */
    public AppSettings() {
        // JPA constructor.
    }

    /**
     * Creates an AppSettings entity with the default calendar and reservation constraints.
     */
    public AppSettings(
            CalendarFirstDay startDay,
            LocalTime startTime,
            LocalTime endTime,
            Integer timeStep,
            Integer maxReservationTime,
            Integer numDaysToShow) {
        this(startDay, startTime, endTime, timeStep, maxReservationTime, numDaysToShow, false);
    }

    /**
     * Creates an AppSettings entity with the default calendar and reservation constraints.
     */
    public AppSettings(
            CalendarFirstDay startDay,
            LocalTime startTime,
            LocalTime endTime,
            Integer timeStep,
            Integer maxReservationTime,
            Integer numDaysToShow,
            Boolean weekendAutoBlockEnabled) {
        this.startDay = startDay;
        this.startTime = startTime;
        this.endTime = endTime;
        this.timeStep = timeStep;
        this.maxReservationTime = maxReservationTime;
        this.numDaysToShow = numDaysToShow;
        this.weekendAutoBlockEnabled = weekendAutoBlockEnabled;
    }

    /**
     * Returns the StartDay.
     *
     * @return the current value
     */
    public CalendarFirstDay getStartDay() {
        return startDay;
    }

    /**
     * Sets the StartDay.
     *
     * @param value the new value
     */
    public void setStartDay(CalendarFirstDay startDay) {
        this.startDay = startDay;
    }

    /**
     * Returns the Id.
     *
     * @return the current value
     */
    public Long getId() {
        return id;
    }

    /**
     * Returns the StartTime.
     *
     * @return the current value
     */
    public LocalTime getStartTime() {
        return startTime;
    }

    /**
     * Sets the StartTime.
     *
     * @param value the new value
     */
    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    /**
     * Returns the EndTime.
     *
     * @return the current value
     */
    public LocalTime getEndTime() {
        return endTime;
    }

    /**
     * Sets the EndTime.
     *
     * @param value the new value
     */
    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    /**
     * Returns the TimeStep.
     *
     * @return the current value
     */
    public Integer getTimeStep() {
        return timeStep;
    }

    /**
     * Sets the TimeStep.
     *
     * @param value the new value
     */
    public void setTimeStep(Integer timeStep) {
        this.timeStep = timeStep;
    }

    /**
     * Returns the MaxReservationTime.
     *
     * @return the current value
     */
    public Integer getMaxReservationTime() {
        return maxReservationTime;
    }

    /**
     * Sets the MaxReservationTime.
     *
     * @param value the new value
     */
    public void setMaxReservationTime(Integer maxReservationTime) {
        this.maxReservationTime = maxReservationTime;
    }

    /**
     * Returns the NumDaysToShow.
     *
     * @return the current value
     */
    public Integer getNumDaysToShow() {
        return numDaysToShow;
    }

    /**
     * Sets the NumDaysToShow.
     *
     * @param value the new value
     */
    public void setNumDaysToShow(Integer numDaysToShow) {
        this.numDaysToShow = numDaysToShow;
    }

    /**
     * Returns the WeekendAutoBlockEnabled.
     *
     * @return the current value
     */
    public Boolean getWeekendAutoBlockEnabled() {
        return weekendAutoBlockEnabled;
    }

    /**
     * Sets the WeekendAutoBlockEnabled.
     *
     * @param value the new value
     */
    public void setWeekendAutoBlockEnabled(Boolean weekendAutoBlockEnabled) {
        this.weekendAutoBlockEnabled = weekendAutoBlockEnabled;
    }
}
