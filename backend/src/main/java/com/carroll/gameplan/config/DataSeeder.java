package com.carroll.gameplan.config;

import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DataSeeder {

    private static final Logger LOGGER = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seed(UserRepository ur,
                           ReservationRepository rr,
                           EquipmentTypeRepository etr,
                           EquipmentRepository er,
                           ReservationService rs) {
        return args -> seedData(ur, rr, etr, er, rs);
    }

    @Transactional
    void seedData(UserRepository ur,
                  ReservationRepository rr,
                  EquipmentTypeRepository etr,
                  EquipmentRepository er,
                  ReservationService rs) {

        // ===== USER =====
        User testUser = ur.findByOidcUserId("00uzv9ab25xQEHKRc697").orElse(null);

        if (testUser == null) {
            testUser = new User();
            testUser.setEmail("testuser@carroll.edu");
            testUser.setFirstName("test");
            testUser.setLastName("user");
            testUser.setOidcUserId("00uzv9ab25xQEHKRc697");
            testUser.setRole(UserRole.STUDENT);
            ur.save(testUser);
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
        Equipment coldBath = createBath("Ice Bath", "cold", bathType, er);
        Equipment coldBath2 = createBath("Ice Bath", "cold", bathType, er);
        Equipment coldBath3 = createBath("Ice Bath", "cold", bathType, er);
        Equipment hotBath = createBath("Hot Bath", "hot", bathType, er);

        // ===== WIRED BOOTS =====
        List<Equipment> largeWiredBoots = createBoots("Large Wired Boots", "L", wiredBootsType, er, 2);

        // ===== WIRELESS BOOTS =====
        List<Equipment> smallWirelessBoots = createBoots("Small Wireless Boots", "S", wirelessBootsType, er, 2);
        List<Equipment> mediumWirelessBoots = createBoots("Medium Wireless Boots", "M", wirelessBootsType, er, 2);

        // ===== OPTIONAL: Example reservations =====
        createReservationIfPossible(rs, testUser, coldBath, LocalDate.now().atTime(8, 0), LocalDate.now().atTime(8, 30));
        createReservationIfPossible(rs, testUser, coldBath2, LocalDate.now().atTime(8, 15), LocalDate.now().atTime(9, 0));
        createReservationIfPossible(rs, testUser, coldBath3, LocalDate.now().atTime(10, 15), LocalDate.now().atTime(10, 45));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 0), LocalDate.now().plusDays(1).atTime(8, 30));
        createReservationIfPossible(rs, testUser, coldBath, LocalDate.now().plusDays(1).atTime(8, 0), LocalDate.now().plusDays(1).atTime(8, 30));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(8, 30), LocalDate.now().plusDays(1).atTime(9, 0));
        createReservationIfPossible(rs, testUser, hotBath, LocalDate.now().plusDays(1).atTime(9, 0), LocalDate.now().plusDays(1).atTime(9, 30));

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
}
