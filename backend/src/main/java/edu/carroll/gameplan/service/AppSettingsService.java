package edu.carroll.gameplan.service;

import edu.carroll.gameplan.dto.response.AppSettingsResponseDTO;
import edu.carroll.gameplan.model.AppSettings;
import edu.carroll.gameplan.model.CalendarFirstDay;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.repository.AppSettingsRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.function.Predicate;

import static edu.carroll.gameplan.AppConstants.MAX_DAYS_TO_SHOW;
import static edu.carroll.gameplan.AppConstants.MIN_DAYS_TO_SHOW;
import static edu.carroll.gameplan.AppConstants.MIN_TIME_STEP_MINUTES;

/**
 * Manages retrieval, validation, persistence, and side effects for global application settings.
 */
@Service
public class AppSettingsService {
    private static final Logger logger = LoggerFactory.getLogger(AppSettingsService.class);
    private static final Long APP_SETTINGS_ID = 1L;
    private static final String SETTINGS_NOT_FOUND_MESSAGE = "No app settings found";

    private final AppSettingsRepository appSettingsRepository;
    private final ReservationRepository reservationRepository;
    private final ScheduleBlockService scheduleBlockService;

    /**
     * Creates a service backed by the app settings repository.
     *
     * @param appSettingsRepository repository used to load and persist settings
     */
    public AppSettingsService(AppSettingsRepository appSettingsRepository,
                              ReservationRepository reservationRepository,
                              ScheduleBlockService scheduleBlockService) {
        this.appSettingsRepository = appSettingsRepository;
        this.reservationRepository = reservationRepository;
        this.scheduleBlockService = scheduleBlockService;
    }

    /**
     * Returns the current application settings.
     *
     * @return current settings mapped to API response format
     */
    public AppSettingsResponseDTO getAppSettings() {
        return toDto(getExistingSettings());
    }

    /**
     * Applies partial updates to the application settings and returns the saved state.
     *
     * @param newSettings incoming settings payload (null fields keep existing values)
     * @return saved settings mapped to API response format
     * @throws IllegalArgumentException when one or more values fail validation
     */
    @Transactional
    public AppSettingsResponseDTO updateAppSettings(AppSettingsResponseDTO newSettings) {
        final AppSettings appSettings = getExistingSettings();

        final CalendarFirstDay startDay = valueOrExisting(newSettings.startDay(), appSettings.getStartDay());
        final LocalTime startTime = valueOrExisting(newSettings.startTime(), appSettings.getStartTime());
        final LocalTime endTime = valueOrExisting(newSettings.endTime(), appSettings.getEndTime());
        final Integer timeStep = valueOrExisting(newSettings.timeStep(), appSettings.getTimeStep());
        final Integer maxReservationTime = valueOrExisting(newSettings.maxReservationTime(), appSettings.getMaxReservationTime());
        final Integer numDaysToShow = valueOrExisting(newSettings.numDaysToShow(), appSettings.getNumDaysToShow());
        final Boolean weekendAutoBlockEnabled = valueOrExisting(
                newSettings.weekendAutoBlockEnabled(),
                appSettings.getWeekendAutoBlockEnabled()
        );

        final boolean wasWeekendAutoBlockEnabled = Boolean.TRUE.equals(appSettings.getWeekendAutoBlockEnabled());

        validateSetting("startDay", startDay, this::isValidStartDay);
        validateSetting("timeStep", timeStep, this::isValidTimeStep);
        validateSetting("maxReservationTime", maxReservationTime, this::isValidMaxReservationTime);
        validateSetting("numDaysToShow", numDaysToShow, this::isValidNumDaysToShow);
        validateSetting("startTime", startTime, this::isValidTimeValue);
        validateSetting("endTime", endTime, this::isValidTimeValue);
        validateSetting("weekendAutoBlockEnabled", weekendAutoBlockEnabled, this::isValidWeekendAutoBlockEnabled);

        if (!isValidSettingsState(startTime, endTime, timeStep, maxReservationTime, numDaysToShow)) {
            logger.warn(
                    "Invalid app settings combination: startTime={}, endTime={}, timeStep={}, maxReservationTime={}, numDaysToShow={}",
                    startTime, endTime, timeStep, maxReservationTime, numDaysToShow
            );
            throw new IllegalArgumentException("Combined settings are invalid");
        }

        appSettings.setStartDay(startDay);
        appSettings.setStartTime(startTime);
        appSettings.setEndTime(endTime);
        appSettings.setTimeStep(timeStep);
        appSettings.setMaxReservationTime(maxReservationTime);
        appSettings.setNumDaysToShow(numDaysToShow);
        appSettings.setWeekendAutoBlockEnabled(weekendAutoBlockEnabled);

        AppSettings saved = appSettingsRepository.save(appSettings);
        int cancelledReservations = cancelOutOfBoundsReservations(startTime, endTime);

        if (Boolean.TRUE.equals(saved.getWeekendAutoBlockEnabled())) {
            scheduleBlockService.syncWeekendAutoBlocksIfEnabled(null);
        } else if (wasWeekendAutoBlockEnabled) {
            scheduleBlockService.removeWeekendAutoBlocks();
        }

        logger.info(
                "App settings updated: startDay={}, startTime={}, endTime={}, timeStep={}, maxReservationTime={}, numDaysToShow={}, weekendAutoBlockEnabled={}, cancelledReservations={}",
                saved.getStartDay(),
                saved.getStartTime(),
                saved.getEndTime(),
                saved.getTimeStep(),
                saved.getMaxReservationTime(),
                saved.getNumDaysToShow(),
                saved.getWeekendAutoBlockEnabled(),
                cancelledReservations
        );
        return toDto(saved);
    }

    /**
     * Loads the singleton app settings row from persistence.
     *
     * @return existing app settings
     * @throws RuntimeException when the singleton row is missing
     */
    private AppSettings getExistingSettings() {
        return appSettingsRepository.findById(APP_SETTINGS_ID)
                .orElseThrow(() -> new RuntimeException(SETTINGS_NOT_FOUND_MESSAGE));
    }

    /**
     * Returns the proposed value when present, otherwise falls back to the existing value.
     *
     * @param proposedValue incoming value from the update request
     * @param existingValue persisted value currently stored
     * @return proposed value when non-null, otherwise existing value
     * @param <T> value type
     */
    private <T> T valueOrExisting(T proposedValue, T existingValue) {
        return proposedValue != null ? proposedValue : existingValue;
    }

    /**
     * Validates a single setting value and throws when invalid.
     *
     * @param fieldName setting field name used in log/error messages
     * @param value setting value to validate
     * @param validator predicate used to validate the value
     * @param <T> value type
     * @throws IllegalArgumentException when the value fails validation
     */
    private <T> void validateSetting(String fieldName, T value, Predicate<T> validator) {
        if (validator.test(value)) {
            return;
        }

        logger.warn("Invalid {}: {}", fieldName, value);
        throw new IllegalArgumentException("Invalid " + fieldName);
    }

    /**
     * Maps the entity model to the API response DTO.
     *
     * @param appSettings settings entity
     * @return DTO representation used by API responses
     */
    private AppSettingsResponseDTO toDto(AppSettings appSettings) {
        return new AppSettingsResponseDTO(
                appSettings.getStartDay(),
                appSettings.getStartTime(),
                appSettings.getEndTime(),
                appSettings.getTimeStep(),
                appSettings.getMaxReservationTime(),
                appSettings.getNumDaysToShow(),
                LocalDate.now(),
                Boolean.TRUE.equals(appSettings.getWeekendAutoBlockEnabled())
        );
    }

    /**
     * Validates the combined settings state after individual fields are validated.
     *
     * @param startTime earliest reservable time
     * @param endTime latest reservable time
     * @param timeStep reservation step in minutes
     * @param maxReservationTime maximum reservation duration in minutes
     * @param numDaysToShow number of calendar days to display
     * @return true when the combined state is valid
     */
    private boolean isValidSettingsState(LocalTime startTime,
                                         LocalTime endTime,
                                         Integer timeStep,
                                         Integer maxReservationTime,
                                         Integer numDaysToShow) {
        return isValidNumDaysToShow(numDaysToShow)
                && isValidTimeStep(timeStep)
                && isValidMaxReservationTime(maxReservationTime)
                && maxReservationTime >= timeStep
                && isValidTimeRange(startTime, endTime)
                && isAlignedToTimeStep(startTime, timeStep)
                && isAlignedToTimeStep(endTime, timeStep);
    }

    /**
     * Validates that a calendar start-day option is provided.
     *
     * @param startDay configured calendar start-day mode
     * @return true when non-null
     */
    private boolean isValidStartDay(CalendarFirstDay startDay) {
        return startDay != null;
    }

    /**
     * Validates that a time value is present.
     *
     * @param time time value
     * @return true when non-null
     */
    private boolean isValidTimeValue(LocalTime time) {
        return time != null;
    }

    /**
     * Validates that the time range is ordered and non-null.
     *
     * @param startTime earliest reservable time
     * @param endTime latest reservable time
     * @return true when start is before end
     */
    private boolean isValidTimeRange(LocalTime startTime, LocalTime endTime) {
        return startTime != null && endTime != null && startTime.isBefore(endTime);
    }

    /**
     * Validates that a time falls on an exact step boundary.
     *
     * @param time time value to check
     * @param timeStep step size in minutes
     * @return true when the time aligns to the given step
     */
    private boolean isAlignedToTimeStep(LocalTime time, Integer timeStep) {
        return time != null && timeStep != null && timeStep > 0 && time.getMinute() % timeStep == 0;
    }

    /**
     * Validates that a time step is positive and matches supported increments.
     *
     * @param timeStep step size in minutes
     * @return true when the value is valid
     */
    private boolean isValidTimeStep(Integer timeStep) {
        return timeStep != null && timeStep > 0 && timeStep % MIN_TIME_STEP_MINUTES == 0;
    }

    /**
     * Validates that the maximum reservation duration is positive and step-aligned.
     *
     * @param maxReservationTime maximum reservation duration in minutes
     * @return true when the value is valid
     */
    private boolean isValidMaxReservationTime(Integer maxReservationTime) {
        return maxReservationTime != null && maxReservationTime > 0 && maxReservationTime % MIN_TIME_STEP_MINUTES == 0;
    }

    /**
     * Validates that the configured day count is within allowed bounds.
     *
     * @param numDaysToShow number of days shown in the schedule
     * @return true when the value is valid
     */
    private boolean isValidNumDaysToShow(Integer numDaysToShow) {
        return numDaysToShow != null && numDaysToShow >= MIN_DAYS_TO_SHOW && numDaysToShow <= MAX_DAYS_TO_SHOW;
    }

    /**
     * Indicates whether ValidWeekendAutoBlockEnabled is true.
     *
     * @return true when the condition is met
     */
    private boolean isValidWeekendAutoBlockEnabled(Boolean weekendAutoBlockEnabled) {
        return weekendAutoBlockEnabled != null;
    }

    /**
     * Cancels active reservations that no longer fit within the configured daily start/end window.
     */
    private int cancelOutOfBoundsReservations(LocalTime startTime, LocalTime endTime) {
        List<Reservation> activeReservations = reservationRepository.findByStatus(ReservationStatus.ACTIVE);

        List<Reservation> toCancel = activeReservations.stream()
                .filter(reservation -> reservation.getStartDatetime().toLocalTime().isBefore(startTime)
                        || reservation.getEndDatetime().toLocalTime().isAfter(endTime))
                .toList();

        if (toCancel.isEmpty()) {
            return 0;
        }

        toCancel.forEach(reservation -> reservation.setStatus(ReservationStatus.CANCELLED));
        reservationRepository.saveAll(toCancel);
        return toCancel.size();
    }
}
