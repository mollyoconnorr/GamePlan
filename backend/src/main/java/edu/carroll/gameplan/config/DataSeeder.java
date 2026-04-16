package edu.carroll.gameplan.config;

import edu.carroll.gameplan.model.*;
import edu.carroll.gameplan.repository.*;
import edu.carroll.gameplan.service.ReservationService;
import edu.carroll.gameplan.service.ScheduleBlockService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Profile("!test")
public class DataSeeder {

    @Bean
    CommandLineRunner seed(UserRepository ur,
                           ReservationRepository rr,
                           EquipmentTypeRepository etr,
                           EquipmentRepository er,
                           ReservationService rs,
                           ScheduleBlockService sbs,
                           AppSettingsRepository asr) {
        return args -> seedData(ur, rr, etr, er, rs, sbs, asr);
    }

    @Transactional
    void seedData(UserRepository ur,
                  ReservationRepository rr,
                  EquipmentTypeRepository etr,
                  EquipmentRepository er,
                  ReservationService rs,
                  ScheduleBlockService sbs,
                  AppSettingsRepository asr) {

        if (!asr.existsById(1L)) {
            final AppSettings appSettings = new AppSettings();
            appSettings.setStartDay(CalendarFirstDay.WEEK);
            appSettings.setTimeStep(15);
            appSettings.setMaxReservationTime(30);
            appSettings.setNumDaysToShow(7);
            appSettings.setStartTime(LocalTime.of(8,0));
            appSettings.setEndTime(LocalTime.of(17,0));
            appSettings.setWeekendAutoBlockEnabled(false);
            asr.save(appSettings);
        }

        // ===== USER =====
        User testUser = ur.findByOidcUserId("00uzv9ab25xQEHKRc697").orElse(null);

        if (testUser == null){
            testUser = new User();
            testUser.setEmail("testuser@carroll.edu");
            testUser.setFirstName("test");
            testUser.setLastName("user");
            testUser.setOidcUserId("00uzv9ab25xQEHKRc697");
            testUser.setRole(UserRole.ATHLETE);
            ur.save(testUser);
        }

        User nick = ur.findByOidcUserId("00u102weronEnCEEI698").orElse(null);

        if (nick == null){
            nick = new User();
            nick.setEmail("nclouse@carroll.edu");
            nick.setFirstName("Nick");
            nick.setLastName("Clouse");
            nick.setOidcUserId("00u102weronEnCEEI698");
            nick.setRole(UserRole.ADMIN);
            ur.save(nick);
        }

        User admin = ur.findByOidcUserId("00u11y@t9p5rRNFw7698").orElse(null);

        if (admin == null){
            admin = new User();
            admin.setEmail("admin@carroll.edu");
            admin.setFirstName("Ad");
            admin.setLastName("min");
            admin.setOidcUserId("00u11y@t9p5rRNFw7698");
            admin.setRole(UserRole.ADMIN);
            ur.save(admin);
        }

        User trainer = ur.findByOidcUserId("00u11y1k1taiQFLy1698").orElse(null);

        if (trainer == null){
            trainer = new User();
            trainer.setEmail("trainer@carroll.edu");
            trainer.setFirstName("train");
            trainer.setLastName("er");
            trainer.setOidcUserId("00u11y1k1taiQFLy1698");
            trainer.setRole(UserRole.AT);
            ur.save(trainer);
        }

        User athlete = ur.findByOidcUserId("00u11y1gagjFS34ub698").orElse(null);

        if (athlete == null){
            athlete = new User();
            athlete.setEmail("athlete@carroll.edu");
            athlete.setFirstName("Ath");
            athlete.setLastName("lete");
            athlete.setOidcUserId("00u11y1gagjFS34ub698");
            athlete.setRole(UserRole.ATHLETE);
            ur.save(athlete);
        }

        // ===== EQUIPMENT TYPES =====
        EquipmentType wiredBootsType = new EquipmentType();
        wiredBootsType.setName("Wired Boots");
        wiredBootsType.setFieldSchema("""
                {
                    "size": {
                        "type":"enum",
                        "options": ["S","M","L"]
                    }
                }
                """);
        wiredBootsType.setColor("#fb923c");
        etr.save(wiredBootsType);

        EquipmentType wirelessBootsType = new EquipmentType();
        wirelessBootsType.setName("Wireless Boots");
        wirelessBootsType.setFieldSchema("""
                {
                    "size": {
                        "type":"enum",
                        "options": ["S","M","L"]
                    }
                }
                """);
        wirelessBootsType.setColor("#a855f7");
        etr.save(wirelessBootsType);

        EquipmentType bathType = new EquipmentType();
        bathType.setName("Bath");
        bathType.setFieldSchema("""
                {
                    "type": {
                        "type":"enum",
                        "options": ["hot","cold"]
                    }
                }
                """);
        bathType.setColor("#38bdf8");
        etr.save(bathType);

        // ===== BATHS =====
        Equipment coldBath = createBath("Ice Bath #1", "cold", bathType, er);
        Equipment coldBath2 = createBath("Ice Bath #2", "cold", bathType, er);
        Equipment coldBath3 = createBath("Ice Bath #3", "cold", bathType, er);
        Equipment hotBath = createBath("Hot Bath", "hot", bathType, er);

        // ===== WIRED BOOTS =====
        List<Equipment> largeWiredBoots = createBoots("Large Wired Boots", "L", wiredBootsType, er, 2);

        // ===== WIRELESS BOOTS =====
        List<Equipment> smallWirelessBoots = createBoots("Small Wireless Boots", "S", wirelessBootsType, er, 2);
        List<Equipment> mediumWirelessBoots = createBoots("Medium Wireless Boots", "M", wirelessBootsType, er, 2);

        // ===== OPTIONAL: Example reservations =====
        createReservationIfPossible(rs, testUser, coldBath, LocalDate.now().plusDays(2).atTime(8, 0), LocalDate.now().plusDays(2).atTime(8, 30));
        createReservationIfPossible(rs, testUser, coldBath2, LocalDate.now().plusDays(2).atTime(8, 15), LocalDate.now().plusDays(2).atTime(9, 0));
        createReservationIfPossible(rs, testUser, coldBath3, LocalDate.now().plusDays(2).atTime(10, 15), LocalDate.now().plusDays(2).atTime(10, 45));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 0), LocalDate.now().plusDays(1).atTime(8, 30));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 30), LocalDate.now().plusDays(1).atTime(9, 0));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(9, 0), LocalDate.now().plusDays(1).atTime(9, 30));

        //  schedule blocks
        createBlockIfPossible(
                sbs,
                nick,
                LocalDate.now().atTime(11, 0),
                LocalDate.now().atTime(12, 0),
                "Team lift block"
        );
        createBlockIfPossible(
                sbs,
                nick,
                LocalDate.now().plusDays(2).atTime(14, 0),
                LocalDate.now().plusDays(2).atTime(15, 0),
                "Facility event"
        );
        createBlockIfPossible(
                sbs,
                nick,
                LocalDate.now().plusDays(4).atTime(8, 0),
                LocalDate.now().plusDays(4).atTime(9, 0),
                "Coach-only window"
        );

    }

    private Equipment createBath(String name, String type, EquipmentType bathType, EquipmentRepository er) {
        Equipment bath = new Equipment();
        bath.setName(name);
        bath.setEquipmentType(bathType);
        bath.setStatus(EquipmentStatus.AVAILABLE);

        EquipmentAttribute attr = new EquipmentAttribute();
        attr.setName("type");
        attr.setValue(type);
        attr.setEquipment(bath);

        bath.setAttributes(List.of(attr));
        er.save(bath);
        return bath;
    }

    private List<Equipment> createBoots(String baseName, String size, EquipmentType type, EquipmentRepository er, int quantity) {
        List<Equipment> bootsList = new ArrayList<>();
        for (int i = 1; i <= quantity; i++) {
            Equipment boots = new Equipment();
            boots.setName(baseName + " " + i);
            boots.setEquipmentType(type);
            boots.setStatus(EquipmentStatus.AVAILABLE);

            EquipmentAttribute sizeAttr = new EquipmentAttribute();
            sizeAttr.setName("size");
            sizeAttr.setValue(size);
            sizeAttr.setEquipment(boots);

            boots.setAttributes(List.of(sizeAttr));
            er.save(boots);
            bootsList.add(boots);
        }
        return bootsList;
    }

    private void createReservationIfPossible(ReservationService rs,
                                             User user,
                                             Equipment equipment,
                                             LocalDateTime start,
                                             LocalDateTime end) {
        try {
            rs.createReservation(user, equipment, start, end);
        } catch (IllegalArgumentException e) {
            Logger logger = LoggerFactory.getLogger(DataSeeder.class);
            logger.debug("Skipping reservation during seed: {}", e.getMessage());
        }
    }

    private void createBlockIfPossible(ScheduleBlockService sbs,
                                       User createdBy,
                                       LocalDateTime start,
                                       LocalDateTime end,
                                       String reason) {
        try {
            sbs.createBlock(createdBy, start, end, reason);
        } catch (IllegalArgumentException e) {
            Logger logger = LoggerFactory.getLogger(DataSeeder.class);
            logger.debug("Skipping schedule block during seed: {}", e.getMessage());
        }
    }
}
