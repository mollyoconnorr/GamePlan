package com.carroll.gameplan.config;

import com.carroll.gameplan.model.*;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import com.carroll.gameplan.service.ReservationService;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DataSeeder {

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

        if (testUser == null){
            testUser = new User();
            testUser.setEmail("testuser@carroll.edu");
            testUser.setFirstName("test");
            testUser.setLastName("user");
            testUser.setOidcUserId("00uzv9ab25xQEHKRc697");
            testUser.setRole(UserRole.ATHLETE);
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
        rs.createReservation(testUser, coldBath, LocalDate.now().atTime(8,0), LocalDate.now().atTime(8,30));
        rs.createReservation(testUser, coldBath2, LocalDate.now().atTime(8,15), LocalDate.now().atTime(9,0));
        rs.createReservation(testUser, coldBath3, LocalDate.now().atTime(10,15), LocalDate.now().atTime(10,45));
        rs.createReservation(testUser, hotBath, LocalDate.now().plusDays(1).atTime(8,0), LocalDate.now().plusDays(1).atTime(8,30));
        rs.createReservation(testUser, coldBath, LocalDate.now().plusDays(1).atTime(8,0), LocalDate.now().plusDays(1).atTime(8,30));
        rs.createReservation(testUser, hotBath, LocalDate.now().plusDays(1).atTime(8,30), LocalDate.now().plusDays(1).atTime(9,0));
        rs.createReservation(testUser, hotBath, LocalDate.now().plusDays(1).atTime(9,0), LocalDate.now().plusDays(1).atTime(9,30));

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
}