package com.carroll.gameplan.service;

import com.carroll.gameplan.dto.CreateEquipmentRequest;
import com.carroll.gameplan.dto.EquipmentDTO;
import com.carroll.gameplan.dto.EquipmentStatusUpdateRequest;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
/**
 * Unit tests covering equipment creation, status transitions, and deletion.
 */
class EquipmentServiceTest {

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private ReservationService reservationService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EquipmentService equipmentService;

    private EquipmentType equipmentType;

    @BeforeEach
    /**
     * Initializes shared test fixtures.
     */
    void setUp() {
        equipmentType = new EquipmentType();
        equipmentType.setName("Bench");
    }

    @Test
    /**
     * Ensures listAllEquipment returns mapped DTOs.
     */
    void listAllEquipmentReturnsDtos() {
        Equipment equipment = new Equipment();
        equipment.setId(5L);
        equipment.setName("Test");
        equipment.setEquipmentType(equipmentType);
        when(equipmentRepository.findAll()).thenReturn(List.of(equipment));

        List<EquipmentDTO> dtos = equipmentService.listAllEquipment();

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getId()).isEqualTo(5L);
    }

    @Test
    /**
     * Verifies new equipment is saved with attribute mapping.
     */
    void createEquipmentBuildsAttributesAndPersists() {
        CreateEquipmentRequest request = new CreateEquipmentRequest();
        request.setEquipmentTypeId(1L);
        request.setName("Rack");
        request.setAttributes(Map.of("height", "6ft"));

        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(equipmentType));
        when(equipmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EquipmentDTO dto = equipmentService.createEquipment(request);

        assertThat(dto.getName()).isEqualTo("Rack");
        verify(equipmentRepository).save(any());
    }

    @Test
    /**
     * Ensures a missing equipment type triggers validation.
     */
    void createEquipmentThrowsWhenTypeMissing() {
        CreateEquipmentRequest request = new CreateEquipmentRequest();
        request.setName("NoType");

        assertThatThrownBy(() -> equipmentService.createEquipment(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Equipment type is required");
    }

    @Test
    /**
     * Confirms switching to maintenance cancels reservations and sends notifications.
     */
    void updateEquipmentCancelsReservationsWhenMaintenance() {
        Equipment equipment = new Equipment();
        equipment.setId(10L);
        equipment.setEquipmentType(equipmentType);
        Reservation reservation = new Reservation();
        User owner = new User();
        reservation.setUser(owner);
        reservation.setId(9L);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(LocalDateTime.now());
        reservation.setEndDatetime(reservation.getStartDatetime().plusMinutes(30));
        equipment.setReservations(List.of(reservation));

        when(equipmentRepository.findById(10L)).thenReturn(java.util.Optional.of(equipment));
        when(reservationService.getActiveReservationsForEquipment(10L)).thenReturn(List.of(reservation));
        when(equipmentRepository.save(any())).thenReturn(equipment);

        EquipmentStatusUpdateRequest request = new EquipmentStatusUpdateRequest();
        request.setStatus(EquipmentStatus.MAINTENANCE.name());

        equipmentService.updateEquipmentStatus(10L, request, owner);

        verify(reservationService).cancelReservation(9L, owner);
        verify(notificationService).createNotification(eq(owner), anyString());
    }

    @Test
    /**
     * Rejects unknown statuses for updates.
     */
    void updateEquipmentStatusRejectsInvalidStatus() {
        Equipment equipment = new Equipment();
        equipment.setId(15L);
        when(equipmentRepository.findById(15L)).thenReturn(java.util.Optional.of(equipment));

        EquipmentStatusUpdateRequest invalid = new EquipmentStatusUpdateRequest();
        invalid.setStatus("BROKEN");

        assertThatThrownBy(() -> equipmentService.updateEquipmentStatus(15L, invalid, new User()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid equipment status");
    }

    @Test
    /**
     * Returns false when deleting nonexistent equipment.
     */
    void deleteEquipmentReturnsFalseWhenMissing() {
        when(equipmentRepository.existsById(100L)).thenReturn(false);

        assertThat(equipmentService.deleteEquipment(100L)).isFalse();
    }
}
