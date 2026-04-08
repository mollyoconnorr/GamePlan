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
                "Team event"
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
                null
        );

        assertTrue(scheduleBlockService.hasActiveBlockConflict(start.plusMinutes(1), end.minusMinutes(1)));

        scheduleBlockService.cancelBlock(result.block().getId());

        ScheduleBlock block = scheduleBlockRepository.findById(result.block().getId()).orElseThrow();
        assertEquals(ScheduleBlockStatus.CANCELLED, block.getStatus());
        assertFalse(scheduleBlockService.hasActiveBlockConflict(start.plusMinutes(1), end.minusMinutes(1)));
    }
}
