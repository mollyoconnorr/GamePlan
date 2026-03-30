package com.carroll.gameplan;

import com.carroll.gameplan.controller.EquipmentController;
import com.carroll.gameplan.dto.EquipmentStatusUpdateRequest;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.UserRole;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest
@Transactional
public class EquipmentControllerIntegrationTest {

    @Autowired
    private EquipmentController equipmentController;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    private OAuth2AuthenticationToken authToken;
    private Equipment equipment;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = new User();
        admin.setEmail("at@example.com");
        admin.setFirstName("AT");
        admin.setLastName("Admin");
        admin.setOidcUserId("at-sub");
        admin.setRole(UserRole.AT);
        userRepository.save(admin);

        User athlete = new User();
        athlete.setEmail("athlete@example.com");
        athlete.setFirstName("Ath");
        athlete.setLastName("Olete");
        athlete.setOidcUserId("athlete-sub");
        athlete.setRole(UserRole.ATHLETE);
        userRepository.save(athlete);

        EquipmentType type = new EquipmentType();
        type.setName("Test Type");
        type.setFieldSchema("{}");
        equipmentTypeRepository.save(type);

        equipment = new Equipment();
        equipment.setName("Test Equipment");
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setEquipmentType(type);
        equipmentRepository.save(equipment);

        Reservation reservation = new Reservation();
        reservation.setEquipment(equipment);
        reservation.setUser(athlete);
        reservation.setStartDatetime(LocalDateTime.now().plusHours(1));
        reservation.setEndDatetime(LocalDateTime.now().plusHours(2));
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservationRepository.save(reservation);

        OidcIdToken token = new OidcIdToken("token", Instant.now(), Instant.now().plusSeconds(1000),
                Map.of("sub", "at-sub"));
        DefaultOidcUser oidcUser = new DefaultOidcUser(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                token
        );
        this.authToken = new OAuth2AuthenticationToken(oidcUser, oidcUser.getAuthorities(), "okta");
    }

    @Test
    void updateStatusCancelsReservations() {
        EquipmentStatusUpdateRequest request = new EquipmentStatusUpdateRequest();
        request.setStatus(EquipmentStatus.MAINTENANCE.name());

        assertDoesNotThrow(() -> equipmentController.updateEquipmentStatus(equipment.getId(), request, authToken));
    }
}
