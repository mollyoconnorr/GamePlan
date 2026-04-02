package com.carroll.gameplan;

import com.carroll.gameplan.dto.response.AppSettingsResponseDTO;
import com.carroll.gameplan.model.AppSettings;
import com.carroll.gameplan.model.CalendarFirstDay;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.AppSettingsRepository;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.NotificationRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.ScheduleBlockRepository;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.AppSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for {@link AppSettingsService}.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AppSettingsServiceTest {

    @Autowired
    private AppSettingsService appSettingsService;

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScheduleBlockRepository scheduleBlockRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        notificationRepository.deleteAll();
        scheduleBlockRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();
        appSettingsRepository.deleteAll();
        appSettingsRepository.save(new AppSettings(
                CalendarFirstDay.WEEK,
                LocalTime.of(8, 0),
                LocalTime.of(17, 0),
                15,
                60,
                7
        ));
    }

    @Test
    void testGetAppSettingsReturnsPersistedValues() {
        AppSettingsResponseDTO settings = appSettingsService.getAppSettings();

        assertEquals(CalendarFirstDay.WEEK, settings.startDay());
        assertEquals(LocalTime.of(8, 0), settings.startTime());
        assertEquals(LocalTime.of(17, 0), settings.endTime());
        assertEquals(15, settings.timeStep());
        assertEquals(60, settings.maxReservationTime());
        assertEquals(7, settings.numDaysToShow());
        assertEquals(LocalDate.now(), settings.startDate());
    }

    @Test
    void testUpdateAppSettingsUpdatesAllFields() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                CalendarFirstDay.CURR_DAY,
                LocalTime.of(9, 0),
                LocalTime.of(18, 0),
                30,
                90,
                10,
                LocalDate.of(2024, 1, 1)
        );

        AppSettingsResponseDTO updated = appSettingsService.updateAppSettings(request);
        AppSettings persisted = appSettingsRepository.findById(1L).orElseThrow();

        assertEquals(CalendarFirstDay.CURR_DAY, updated.startDay());
        assertEquals(LocalTime.of(9, 0), updated.startTime());
        assertEquals(LocalTime.of(18, 0), updated.endTime());
        assertEquals(30, updated.timeStep());
        assertEquals(90, updated.maxReservationTime());
        assertEquals(10, updated.numDaysToShow());
        assertEquals(LocalDate.now(), updated.startDate());

        assertEquals(CalendarFirstDay.CURR_DAY, persisted.getStartDay());
        assertEquals(LocalTime.of(9, 0), persisted.getStartTime());
        assertEquals(LocalTime.of(18, 0), persisted.getEndTime());
        assertEquals(30, persisted.getTimeStep());
        assertEquals(90, persisted.getMaxReservationTime());
        assertEquals(10, persisted.getNumDaysToShow());
    }

    @Test
    void testUpdateAppSettingsUsesExistingValuesForNullFields() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                null,
                LocalTime.of(16, 30),
                null,
                null,
                null,
                null
        );

        AppSettingsResponseDTO updated = appSettingsService.updateAppSettings(request);
        AppSettings persisted = appSettingsRepository.findById(1L).orElseThrow();

        assertEquals(CalendarFirstDay.WEEK, updated.startDay());
        assertEquals(LocalTime.of(8, 0), updated.startTime());
        assertEquals(LocalTime.of(16, 30), updated.endTime());
        assertEquals(15, updated.timeStep());
        assertEquals(60, updated.maxReservationTime());
        assertEquals(7, updated.numDaysToShow());
        assertEquals(LocalDate.now(), updated.startDate());

        assertEquals(CalendarFirstDay.WEEK, persisted.getStartDay());
        assertEquals(LocalTime.of(8, 0), persisted.getStartTime());
        assertEquals(LocalTime.of(16, 30), persisted.getEndTime());
        assertEquals(15, persisted.getTimeStep());
        assertEquals(60, persisted.getMaxReservationTime());
        assertEquals(7, persisted.getNumDaysToShow());
    }

    @Test
    void testUpdateAppSettingsRejectsInvalidTimeStep() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                null,
                null,
                20,
                null,
                null,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        AppSettings persisted = appSettingsRepository.findById(1L).orElseThrow();
        assertEquals("Invalid timeStep", exception.getMessage());
        assertEquals(15, persisted.getTimeStep());
    }

    @Test
    void testUpdateAppSettingsRejectsInvalidMaxReservationTime() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                null,
                null,
                null,
                10,
                null,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        AppSettings persisted = appSettingsRepository.findById(1L).orElseThrow();
        assertEquals("Invalid maxReservationTime", exception.getMessage());
        assertEquals(60, persisted.getMaxReservationTime());
    }

    @Test
    void testUpdateAppSettingsRejectsInvalidNumDaysToShow() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                null,
                null,
                null,
                null,
                0,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        AppSettings persisted = appSettingsRepository.findById(1L).orElseThrow();
        assertEquals("Invalid numDaysToShow", exception.getMessage());
        assertEquals(7, persisted.getNumDaysToShow());
    }

    @Test
    void testUpdateAppSettingsRejectsInvalidTimeRange() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                LocalTime.of(18, 0),
                LocalTime.of(17, 0),
                null,
                null,
                null,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        assertEquals("Combined settings are invalid", exception.getMessage());
    }

    @Test
    void testUpdateAppSettingsRejectsMisalignedStartTime() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                LocalTime.of(8, 10),
                null,
                null,
                null,
                null,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        assertEquals("Combined settings are invalid", exception.getMessage());
    }

    @Test
    void testUpdateAppSettingsRejectsMaxReservationTimeLessThanTimeStep() {
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                null,
                null,
                30,
                15,
                null,
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        assertEquals("Combined settings are invalid", exception.getMessage());
    }

    @Test
    void testGetAppSettingsThrowsWhenSettingsMissing() {
        appSettingsRepository.deleteAll();

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> appSettingsService.getAppSettings()
        );

        assertEquals("No app settings found", exception.getMessage());
    }

    @Test
    void testUpdateAppSettingsThrowsWhenSettingsMissing() {
        appSettingsRepository.deleteAll();
        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                CalendarFirstDay.CURR_DAY,
                LocalTime.of(9, 0),
                LocalTime.of(17, 0),
                30,
                60,
                7,
                null
        );

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> appSettingsService.updateAppSettings(request)
        );

        assertEquals("No app settings found", exception.getMessage());
    }

    @Test
    void testUpdateAppSettingsCancelsReservationsOutsideNewBounds() {
        User athlete = new User();
        athlete.setEmail("athlete@carroll.edu");
        athlete.setFirstName("Ath");
        athlete.setLastName("Lete");
        athlete.setRole(UserRole.ATHLETE);
        athlete = userRepository.save(athlete);

        EquipmentType type = new EquipmentType();
        type.setName("Settings Test Type");
        type.setFieldSchema("{}");
        type = equipmentTypeRepository.save(type);

        Equipment equipment = new Equipment();
        equipment.setName("Settings Test Equipment");
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setEquipmentType(type);
        equipment = equipmentRepository.save(equipment);

        LocalDateTime baseDate = LocalDate.now().plusDays(1).atStartOfDay();

        Reservation insideBounds = new Reservation();
        insideBounds.setUser(athlete);
        insideBounds.setEquipment(equipment);
        insideBounds.setStartDatetime(baseDate.withHour(9).withMinute(30));
        insideBounds.setEndDatetime(baseDate.withHour(10).withMinute(0));
        insideBounds.setStatus(ReservationStatus.ACTIVE);
        insideBounds = reservationRepository.save(insideBounds);

        Reservation beforeStart = new Reservation();
        beforeStart.setUser(athlete);
        beforeStart.setEquipment(equipment);
        beforeStart.setStartDatetime(baseDate.withHour(8).withMinute(30));
        beforeStart.setEndDatetime(baseDate.withHour(9).withMinute(0));
        beforeStart.setStatus(ReservationStatus.ACTIVE);
        beforeStart = reservationRepository.save(beforeStart);

        Reservation afterEnd = new Reservation();
        afterEnd.setUser(athlete);
        afterEnd.setEquipment(equipment);
        afterEnd.setStartDatetime(baseDate.withHour(15).withMinute(30));
        afterEnd.setEndDatetime(baseDate.withHour(16).withMinute(30));
        afterEnd.setStatus(ReservationStatus.ACTIVE);
        afterEnd = reservationRepository.save(afterEnd);

        AppSettingsResponseDTO request = new AppSettingsResponseDTO(
                null,
                LocalTime.of(9, 0),
                LocalTime.of(16, 0),
                null,
                null,
                null,
                null
        );

        appSettingsService.updateAppSettings(request);

        Reservation insideReloaded = reservationRepository.findById(insideBounds.getId()).orElseThrow();
        Reservation beforeReloaded = reservationRepository.findById(beforeStart.getId()).orElseThrow();
        Reservation afterReloaded = reservationRepository.findById(afterEnd.getId()).orElseThrow();

        assertEquals(ReservationStatus.ACTIVE, insideReloaded.getStatus());
        assertEquals(ReservationStatus.CANCELLED, beforeReloaded.getStatus());
        assertEquals(ReservationStatus.CANCELLED, afterReloaded.getStatus());
    }
}
