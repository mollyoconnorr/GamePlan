package edu.carroll.gameplan.service;

import edu.carroll.gameplan.dto.request.CreateEquipmentTypeRequest;
import edu.carroll.gameplan.dto.response.EquipmentAttributeDTO;
import edu.carroll.gameplan.dto.request.EquipmentTypeUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentTypeDTO;
import edu.carroll.gameplan.dto.response.EquipmentWithReservationsDTO;
import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentAttribute;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.EquipmentType;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EquipmentTypeService} attribute parsing and metadata handling.
 */
@ExtendWith(MockitoExtension.class)
class EquipmentTypeServiceTest {

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private EquipmentTypeService equipmentTypeService;

    private EquipmentType type;

    /**
     * Prepares a reusable equipment type fixture for the tests.
     */
    @BeforeEach
    void setUp() {
        type = new EquipmentType();
        type.setName("Racks");
        assignId(type, 1L);
    }

    /**
     * Verifies equipment types are converted into DTOs.
     */
    @Test
    void listEquipmentTypesTransformsToDto() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(type));

        List<EquipmentTypeDTO> result = equipmentTypeService.listEquipmentTypes();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Racks");
    }

    /**
     * Ensures duplicate names cannot be created.
     */
    @Test
    void createEquipmentTypeRejectsDuplicateName() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(type));
        CreateEquipmentTypeRequest request = new CreateEquipmentTypeRequest();
        request.setName("Racks");

        assertThatThrownBy(() -> equipmentTypeService.createEquipmentType(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    /**
     * Confirms blank names are rejected when creating a type.
     */
    @Test
    void createEquipmentTypeRejectsBlankName() {
        CreateEquipmentTypeRequest request = new CreateEquipmentTypeRequest();
        request.setName(" ");

        assertThatThrownBy(() -> equipmentTypeService.createEquipmentType(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
    }

    /**
     * Explores attribute aggregation across equipment instances.
     */
    @Test
    void getUniqueAttributesReturnsDistinctPairs() {
        Equipment equipment = new Equipment();
        EquipmentAttribute attr = new EquipmentAttribute();
        attr.setName("size");
        attr.setValue("L");
        equipment.setAttributes(List.of(attr));
        type.setEquipmentList(List.of(equipment));
        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(type));

        List<EquipmentAttributeDTO> attributes = equipmentTypeService.getUniqueAttributes(1L);

        assertThat(attributes).hasSize(1);
        assertThat(attributes.get(0).getName()).isEqualTo("size");
    }

    /**
     * Ensures the service gracefully handles missing equipment lists.
     */
    @Test
    void getUniqueAttributesHandlesMissingEquipmentList() {
        type.setEquipmentList(null);
        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(type));

        assertThat(equipmentTypeService.getUniqueAttributes(1L)).isEmpty();
    }

    /**
     * Validates updates trim whitespace and persist changes.
     */
    @Test
    void updateEquipmentTypeTrimsNameAndSchema() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(type));
        when(equipmentTypeRepository.save(type)).thenReturn(type);
        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(type));
        EquipmentTypeUpdateRequest request = new EquipmentTypeUpdateRequest();
        request.setName("  New Name  ");
        request.setFieldSchema("{}");
        request.setColor("blue");

        EquipmentTypeDTO dto = equipmentTypeService.updateEquipmentType(1L, request);

        assertThat(dto.name()).isEqualTo("New Name");
    }

    /**
     * Verifies available-equipment queries include status filtering and DTO mapping.
     */
    @Test
    void getAvailableEquipmentWithReservationsFiltersToAvailableStatus() {
        Equipment equipment = new Equipment();
        equipment.setId(5L);
        equipment.setName("Rack One");
        equipment.setStatus(EquipmentStatus.AVAILABLE);

        EquipmentAttribute attribute = new EquipmentAttribute();
        attribute.setName("size");
        attribute.setValue("L");
        attribute.setEquipment(equipment);
        equipment.setAttributes(List.of(attribute));

        Reservation reservation = new Reservation();
        reservation.setId(10L);
        reservation.setStartDatetime(LocalDateTime.of(2026, 4, 15, 10, 0));
        reservation.setEndDatetime(LocalDateTime.of(2026, 4, 15, 11, 0));
        reservation.setStatus(ReservationStatus.ACTIVE);

        when(equipmentRepository.findByTypeAndAttributeAndStatus(1L, "size", "L", EquipmentStatus.AVAILABLE))
                .thenReturn(List.of(equipment));
        when(reservationRepository.findByEquipmentIdAndEndDatetimeAfterAndStatusIs(eq(5L), any(LocalDateTime.class), eq(ReservationStatus.ACTIVE)))
                .thenReturn(List.of(reservation));

        List<EquipmentWithReservationsDTO> result =
                equipmentTypeService.getAvailableEquipmentWithReservations(1L, "size", "L");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Rack One");
        assertThat(result.get(0).attributes()).hasSize(1);
        assertThat(result.get(0).reservations()).hasSize(1);
        verify(equipmentRepository).findByTypeAndAttributeAndStatus(1L, "size", "L", EquipmentStatus.AVAILABLE);
    }

    /**
     * Ensures cancelled and past reservations are excluded from the summary payload.
     */
    @Test
    void getAvailableEquipmentWithReservationsFiltersInactiveReservations() {
        Equipment equipment = new Equipment();
        equipment.setId(6L);
        equipment.setName("Rack Two");
        equipment.setStatus(EquipmentStatus.AVAILABLE);

        Reservation activeReservation = new Reservation();
        activeReservation.setId(11L);
        activeReservation.setStartDatetime(LocalDateTime.now().plusHours(1));
        activeReservation.setEndDatetime(LocalDateTime.now().plusHours(2));
        activeReservation.setStatus(ReservationStatus.ACTIVE);

        Reservation cancelledReservation = new Reservation();
        cancelledReservation.setId(12L);
        cancelledReservation.setStartDatetime(LocalDateTime.now().plusHours(3));
        cancelledReservation.setEndDatetime(LocalDateTime.now().plusHours(4));
        cancelledReservation.setStatus(ReservationStatus.CANCELLED);

        Reservation pastReservation = new Reservation();
        pastReservation.setId(13L);
        pastReservation.setStartDatetime(LocalDateTime.now().minusHours(3));
        pastReservation.setEndDatetime(LocalDateTime.now().minusHours(2));
        pastReservation.setStatus(ReservationStatus.ACTIVE);

        when(equipmentRepository.findByTypeAndAttributeAndStatus(2L, "size", "L", EquipmentStatus.AVAILABLE))
                .thenReturn(List.of(equipment));
        when(reservationRepository.findByEquipmentIdAndEndDatetimeAfterAndStatusIs(eq(6L), any(LocalDateTime.class), eq(ReservationStatus.ACTIVE)))
                .thenReturn(List.of(activeReservation));

        List<EquipmentWithReservationsDTO> result =
                equipmentTypeService.getAvailableEquipmentWithReservations(2L, "size", "L");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).reservations()).hasSize(1);
        assertThat(result.get(0).reservations().get(0).id()).isEqualTo(11L);
    }

    /**
     * Ensures new type attributes are added to existing equipment with the first option as default.
     */
    @Test
    void updateEquipmentTypeAppliesDefaultForNewAttributes() {
        type.setFieldSchema("""
                {"size":{"type":"enum","options":["Small","Large"]}}
                """);

        Equipment equipment = new Equipment();
        EquipmentAttribute sizeAttribute = new EquipmentAttribute();
        sizeAttribute.setName("size");
        sizeAttribute.setValue("Large");
        sizeAttribute.setEquipment(equipment);
        equipment.setAttributes(new ArrayList<>(List.of(sizeAttribute)));
        type.setEquipmentList(List.of(equipment));

        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(type));
        when(equipmentTypeRepository.save(type)).thenReturn(type);

        EquipmentTypeUpdateRequest request = new EquipmentTypeUpdateRequest();
        request.setFieldSchema("""
                {"size":{"type":"enum","options":["Small","Large"]},"condition":{"type":"enum","options":["Good","Fair"]}}
                """);

        equipmentTypeService.updateEquipmentType(1L, request);

        assertThat(equipment.getAttributes()).hasSize(2);
        assertThat(equipment.getAttributes())
                .anySatisfy(attribute -> {
                    assertThat(attribute.getName()).isEqualTo("condition");
                    assertThat(attribute.getValue()).isEqualTo("Good");
                });
        verify(equipmentRepository).saveAll(type.getEquipmentList());
    }

    private void assignId(EquipmentType target, Long value) {
        try {
            Field field = EquipmentType.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
