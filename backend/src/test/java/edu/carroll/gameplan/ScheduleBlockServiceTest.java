package edu.carroll.gameplan;

import edu.carroll.gameplan.model.*;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import edu.carroll.gameplan.repository.ScheduleBlockRepository;
import edu.carroll.gameplan.repository.UserRepository;
import edu.carroll.gameplan.service.ScheduleBlockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ScheduleBlockServiceTest {

    @Autowired
    private ScheduleBlockService scheduleBlockService;

    @Autowired
    private ScheduleBlockRepository scheduleBlockRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    private User trainerUser;
    private User athleteUser;
    private Equipment equipment;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        scheduleBlockRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        trainerUser = new User();
        trainerUser.setEmail("trainer@carroll.edu");
        trainerUser.setFirstName("Train");
        trainerUser.setLastName("Er");
        trainerUser.setRole(UserRole.AT);
        trainerUser = userRepository.save(trainerUser);

        athleteUser = new User();
        athleteUser.setEmail("athlete@carroll.edu");
        athleteUser.setFirstName("Ath");
        athleteUser.setLastName("Lete");
        athleteUser.setRole(UserRole.ATHLETE);
        athleteUser = userRepository.save(athleteUser);

        EquipmentType type = new EquipmentType();
        type.setName("Block Test Type");
        type.setFieldSchema("{}");
        type = equipmentTypeRepository.save(type);

        equipment = new Equipment();
        equipment.setName("Block Test Equipment");
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setEquipmentType(type);
        equipment = equipmentRepository.save(equipment);
    }

    @Test
    void testCreateBlockCancelsConflictingReservations() {
        LocalDateTime start = LocalDateTime.now().plusHours(2).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);

        Reservation overlapping = new Reservation();
        overlapping.setUser(athleteUser);
        overlapping.setEquipment(equipment);
        overlapping.setStartDatetime(start.plusMinutes(5));
        overlapping.setEndDatetime(end.plusMinutes(5));
        overlapping.setStatus(ReservationStatus.ACTIVE);
        overlapping = reservationRepository.save(overlapping);

        Reservation nonOverlapping = new Reservation();
        nonOverlapping.setUser(athleteUser);
        nonOverlapping.setEquipment(equipment);
        nonOverlapping.setStartDatetime(end.plusHours(1));
        nonOverlapping.setEndDatetime(end.plusHours(1).plusMinutes(30));
        nonOverlapping.setStatus(ReservationStatus.ACTIVE);
        nonOverlapping = reservationRepository.save(nonOverlapping);

        ScheduleBlockService.CreateBlockResult result = scheduleBlockService.createBlock(
                trainerUser,
                start,
                end,
                "Team event",
                ScheduleBlockType.BLOCK
        );

        Reservation reloadedOverlap = reservationRepository.findById(overlapping.getId()).orElseThrow();
        Reservation reloadedOther = reservationRepository.findById(nonOverlapping.getId()).orElseThrow();

        assertEquals(1, result.canceledReservations());
        assertEquals(ReservationStatus.CANCELLED, reloadedOverlap.getStatus());
        assertEquals(ReservationStatus.ACTIVE, reloadedOther.getStatus());
        assertTrue(scheduleBlockService.hasActiveBlockConflict(start.plusMinutes(1), end.minusMinutes(1)));
    }

    @Test
    void testCancelBlockMarksBlockCancelled() {
        LocalDateTime start = LocalDateTime.now().plusHours(6).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);

        ScheduleBlockService.CreateBlockResult result = scheduleBlockService.createBlock(
                trainerUser,
                start,
                end,
                null,
                ScheduleBlockType.BLOCK
        );

        assertTrue(scheduleBlockService.hasActiveBlockConflict(start.plusMinutes(1), end.minusMinutes(1)));

        scheduleBlockService.cancelBlock(result.block().getId());

        ScheduleBlock block = scheduleBlockRepository.findById(result.block().getId()).orElseThrow();
        assertEquals(ScheduleBlockStatus.CANCELLED, block.getStatus());
        assertFalse(scheduleBlockService.hasActiveBlockConflict(start.plusMinutes(1), end.minusMinutes(1)));
    }

    @Test
    void testGetActiveBlocksIncludesWeekendBlocksForRange() {
        LocalDateTime from = LocalDateTime.now()
                .with(TemporalAdjusters.next(DayOfWeek.FRIDAY))
                .withHour(0)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        LocalDateTime to = from.plusDays(3);

        List<ScheduleBlock> blocks = scheduleBlockService.getActiveBlocks(from, to);

        long weekendBlocks = blocks.stream()
                .filter(block -> "Weekend".equals(block.getReason()))
                .count();

        assertEquals(2, weekendBlocks);
        assertTrue(scheduleBlockService.hasWeekendConflict(from.plusHours(1), to.minusHours(1)));
    }

    @Test
    void testCreateOpenWindowDoesNotCancelReservations() {
        LocalDateTime start = LocalDateTime.now().with(TemporalAdjusters.next(DayOfWeek.SATURDAY))
                .withHour(10)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        LocalDateTime end = start.plusHours(2);

        Reservation reservation = new Reservation();
        reservation.setUser(athleteUser);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start.plusMinutes(30));
        reservation.setEndDatetime(start.plusMinutes(60));
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservationRepository.save(reservation);

        ScheduleBlockService.CreateBlockResult result = scheduleBlockService.createBlock(
                trainerUser,
                start,
                end,
                "Open gym",
                ScheduleBlockType.OPEN
        );

        Reservation reloaded = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertEquals(0, result.canceledReservations());
        assertEquals(ReservationStatus.ACTIVE, reloaded.getStatus());
        assertEquals(ScheduleBlockType.OPEN, result.block().getBlockType());
    }

    @Test
    void testUpdateBlockCanCancelReservations() {
        LocalDateTime start = LocalDateTime.now().with(TemporalAdjusters.next(DayOfWeek.THURSDAY))
                .withHour(11)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        LocalDateTime end = start.plusHours(1);

        ScheduleBlockService.CreateBlockResult created = scheduleBlockService.createBlock(
                trainerUser,
                start,
                end,
                "Open gym",
                ScheduleBlockType.OPEN
        );

        Reservation reservation = new Reservation();
        reservation.setUser(athleteUser);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start.plusMinutes(10));
        reservation.setEndDatetime(end.minusMinutes(10));
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservation = reservationRepository.save(reservation);

        ScheduleBlockService.CreateBlockResult updated = scheduleBlockService.updateBlock(
                created.block().getId(),
                start,
                end,
                "Team event",
                ScheduleBlockType.BLOCK
        );

        Reservation reloaded = reservationRepository.findById(reservation.getId()).orElseThrow();
        ScheduleBlock reloadedBlock = scheduleBlockRepository.findById(created.block().getId()).orElseThrow();

        assertEquals(1, updated.canceledReservations());
        assertEquals(ReservationStatus.CANCELLED, reloaded.getStatus());
        assertEquals(ScheduleBlockType.BLOCK, reloadedBlock.getBlockType());
        assertEquals("Team event", reloadedBlock.getReason());
    }
}
