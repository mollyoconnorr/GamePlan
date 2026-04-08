package edu.carroll.gameplan.dto.response;

import edu.carroll.gameplan.model.CalendarFirstDay;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Response payload for application settings endpoints.
 *
 * @param startDay first day behavior used when rendering the calendar
 * @param startTime earliest reservable time of day
 * @param endTime latest reservable time of day
 * @param timeStep reservation step size in minutes
 * @param maxReservationTime maximum reservation duration in minutes
 * @param numDaysToShow number of days displayed in the calendar
 * @param startDate date used by the client as the current calendar anchor
 */
public record AppSettingsResponseDTO(
        CalendarFirstDay startDay,
        LocalTime startTime,
        LocalTime endTime,
        Integer timeStep,
        Integer maxReservationTime,
        Integer numDaysToShow,
        LocalDate startDate
) {
}
