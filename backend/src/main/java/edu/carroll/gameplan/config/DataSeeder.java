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
import org.springframework.core.annotation.Order;
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
    @Order(1)
    CommandLineRunner seedBaselineData(UserRepository ur,
                                       EquipmentTypeRepository etr,
                                       EquipmentRepository er,
                                       AppSettingsRepository asr) {
        return args -> seedBaselineRows(ur, etr, er, asr);
    }

    @Bean
    @Profile("dev")
    @Order(2)
    CommandLineRunner seedDevData(UserRepository ur,
                                  EquipmentRepository er,
                                  ReservationService rs,
                                  ScheduleBlockService sbs) {
        return args -> seedDevRows(ur, er, rs, sbs);
    }

    @Transactional
    void seedBaselineRows(UserRepository ur,
                          EquipmentTypeRepository etr,
                          EquipmentRepository er,
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

        // ===== EQUIPMENT TYPES =====
        findOrCreateEquipmentType(
                etr,
                "Wired Boots",
                """
                        {
                            "size": {
                                "type":"enum",
                                "options": ["S","M","L"]
                            }
                        }
                        """,
                "#fb923c"
        );

        findOrCreateEquipmentType(
                etr,
                "Wireless Boots",
                """
                        {
                            "size": {
                                "type":"enum",
                                "options": ["S","M","L"]
                            }
                        }
                        """,
                "#a855f7"
        );

        findOrCreateEquipmentType(
                etr,
                "Bath",
                """
                        {
                            "type": {
                                "type":"enum",
                                "options": ["hot","cold"]
                            }
                        }
                        """,
                "#38bdf8"
        );

        User kris = ur.findByEmailIgnoreCase("kward@carroll.edu").orElse(null);

        if (kris == null){
            kris = new User();
            kris.setEmail("kward@carroll.edu");
            kris.setFirstName("Kris");
            kris.setLastName("Ward");
            kris.setOidcUserId(null);
            kris.setRole(UserRole.ADMIN);
            ur.save(kris);
        }

        EquipmentType wiredBootsType = etr.findByName("Wired Boots").orElseThrow();
        EquipmentType wirelessBootsType = etr.findByName("Wireless Boots").orElseThrow();
        EquipmentType bathType = etr.findByName("Bath").orElseThrow();

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
    }

    @Transactional
    void seedDevRows(UserRepository ur,
                     EquipmentRepository er,
                     ReservationService rs,
                     ScheduleBlockService sbs) {
        // ===== USER =====
        User testUser = ur.findByEmailIgnoreCase("testuser@carroll.edu").orElse(null);

        if (testUser == null){
            testUser = new User();
            testUser.setEmail("testuser@carroll.edu");
            testUser.setFirstName("test");
            testUser.setLastName("user");
            testUser.setOidcUserId(null);
            testUser.setRole(UserRole.ATHLETE);
            ur.save(testUser);
        }

        User admin = ur.findByEmailIgnoreCase("admin@carroll.edu").orElse(null);

        if (admin == null){
            admin = new User();
            admin.setEmail("admin@carroll.edu");
            admin.setFirstName("Ad");
            admin.setLastName("min");
            admin.setOidcUserId(null);
            admin.setRole(UserRole.ADMIN);
            ur.save(admin);
        }

        User trainer = ur.findByEmailIgnoreCase("trainer@carroll.edu").orElse(null);

        if (trainer == null){
            trainer = new User();
            trainer.setEmail("trainer@carroll.edu");
            trainer.setFirstName("train");
            trainer.setLastName("er");
            trainer.setOidcUserId(null);
            trainer.setRole(UserRole.AT);
            ur.save(trainer);
        }

        User athlete = ur.findByEmailIgnoreCase("athlete@carroll.edu").orElse(null);

        if (athlete == null){
            athlete = new User();
            athlete.setEmail("athlete@carroll.edu");
            athlete.setFirstName("Ath");
            athlete.setLastName("lete");
            athlete.setOidcUserId(null);
            athlete.setRole(UserRole.ATHLETE);
            ur.save(athlete);
        }

        Equipment coldBath = findEquipmentByName(er, "Ice Bath #1");
        Equipment coldBath2 = findEquipmentByName(er, "Ice Bath #2");
        Equipment coldBath3 = findEquipmentByName(er, "Ice Bath #3");
        Equipment hotBath = findEquipmentByName(er, "Hot Bath");

        // ===== Example reservations =====
        createReservationIfPossible(rs, testUser, coldBath, LocalDate.now().plusDays(2).atTime(8, 0), LocalDate.now().plusDays(2).atTime(8, 30));
        createReservationIfPossible(rs, testUser, coldBath2, LocalDate.now().plusDays(2).atTime(8, 15), LocalDate.now().plusDays(2).atTime(9, 0));
        createReservationIfPossible(rs, testUser, coldBath3, LocalDate.now().plusDays(2).atTime(10, 15), LocalDate.now().plusDays(2).atTime(10, 45));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 0), LocalDate.now().plusDays(1).atTime(8, 30));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 30), LocalDate.now().plusDays(1).atTime(9, 0));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(9, 0), LocalDate.now().plusDays(1).atTime(9, 30));

        //  schedule blocks
        createBlockIfPossible(
                sbs,
                admin,
                LocalDate.now().atTime(11, 0),
                LocalDate.now().atTime(12, 0),
                "Team lift block"
        );
        createBlockIfPossible(
                sbs,
                admin,
                LocalDate.now().plusDays(2).atTime(14, 0),
                LocalDate.now().plusDays(2).atTime(15, 0),
                "Facility event"
        );
        createBlockIfPossible(
                sbs,
                admin,
                LocalDate.now().plusDays(4).atTime(8, 0),
                LocalDate.now().plusDays(4).atTime(9, 0),
                "Coach-only window"
        );

    }

    private EquipmentType findOrCreateEquipmentType(EquipmentTypeRepository etr,
                                                    String name,
                                                    String fieldSchema,
                                                    String color) {
        return etr.findByName(name).orElseGet(() -> {
            EquipmentType equipmentType = new EquipmentType();
            equipmentType.setName(name);
            equipmentType.setFieldSchema(fieldSchema);
            equipmentType.setColor(color);
            return etr.save(equipmentType);
        });
    }

    private Equipment findEquipmentByName(EquipmentRepository er, String name) {
        return er.findAll()
                .stream()
                .filter(equipment -> equipment.getName().equals(name))
                .findFirst()
                .orElseThrow();
    }

    private Equipment createBath(String name, String type, EquipmentType bathType, EquipmentRepository er) {
        Equipment existingBath = er.findByNameAndEquipmentType(name, bathType).orElse(null);
        if (existingBath != null) {
            return existingBath;
        }

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
            String name = baseName + " " + i;
            Equipment existingBoots = er.findByNameAndEquipmentType(name, type).orElse(null);
            if (existingBoots != null) {
                bootsList.add(existingBoots);
                continue;
            }

            Equipment boots = new Equipment();
            boots.setName(name);
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
