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

        User testUser = ur.findByOidcUserId("00uzv9ab25xQEHKRc697").orElse(null);

        // Save user if not exists
        if (testUser == null){
            testUser = new User();
            testUser.setEmail("testuser@carroll.edu");
            testUser.setFirstName("test");
            testUser.setLastName("user");
            testUser.setOidcUserId("00uzv9ab25xQEHKRc697");
            testUser.setRole(UserRole.ATHLETE);

            ur.save(testUser);
        }

        final EquipmentType bootsType = new EquipmentType();
        bootsType.setName("Compression Boots");
        bootsType.setFieldSchema("""
                {
                    "size": {
                      "type":"enum",
                      "options": ["S","M","L"]
                    },
                    "wired": {
                      "type":"boolean"
                    }
                }
                """);
        etr.save(bootsType);

        final EquipmentType bathType = new EquipmentType();
        bathType.setName("Ice Bath");
        bathType.setFieldSchema("""
                {
                "type": {
                      "type":"enum",
                      "options": ["hot","cold"]
                    }
                }
                """);
        etr.save(bathType);


        final Equipment bath = new Equipment();
        bath.setName("Ice Bath");
        bath.setEquipmentType(bathType);
        bath.setStepMin(15);
        bath.setMinTime(15);
        bath.setMaxTime(60);
        bath.setMinResLength(15);
        bath.setMaxResLength(15);
        bath.setDefaultResLength(30);
        bath.setStatus(EquipmentStatus.AVAILABLE);
        er.save(bath);

        final Equipment boots = new Equipment();
        boots.setName("Compression boots");
        boots.setEquipmentType(bootsType);
        boots.setStepMin(15);
        boots.setMinTime(15);
        boots.setMaxTime(60);
        boots.setMinResLength(15);
        boots.setMaxResLength(15);
        boots.setDefaultResLength(30);
        boots.setStatus(EquipmentStatus.AVAILABLE);
        er.save(boots);

        // Bath res for today
        rs.createReservation(
                testUser,
                bath,
                LocalDate.now().atTime(8, 0),
                LocalDate.now().atTime(9, 0)
        );

        // Bath res for tomorrow
        rs.createReservation(
                testUser,
                bath,
                LocalDate.now().plusDays(1).atTime(8, 0),
                LocalDate.now().plusDays(1).atTime(9, 0)
        );

        // Boots res for today
        rs.createReservation(
                testUser,
                boots,
                LocalDate.now().atTime(13, 0),
                LocalDate.now().atTime(14, 0)
        );

        // Boots res for tomorrow
        rs.createReservation(
                testUser,
                boots,
                LocalDate.now().plusDays(1).atTime(10, 0),
                LocalDate.now().plusDays(1).atTime(11, 0)
        );

        // Boots res for 3 days from today
        rs.createReservation(
                testUser,
                boots,
                LocalDate.now().plusDays(3).atTime(12, 0),
                LocalDate.now().plusDays(3).atTime(13, 0)
        );
    }

}
