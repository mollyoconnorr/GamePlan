package com.carroll.gameplan.service;

import com.carroll.gameplan.dto.CreateEquipmentTypeRequest;
import com.carroll.gameplan.dto.EquipmentAttributeDTO;
import com.carroll.gameplan.dto.EquipmentTypeDTO;
import com.carroll.gameplan.dto.EquipmentTypeUpdateRequest;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentAttribute;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EquipmentTypeServiceTest {

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @InjectMocks
    private EquipmentTypeService equipmentTypeService;

    private EquipmentType type;

    @BeforeEach
    void setUp() {
        type = new EquipmentType();
        type.setName("Racks");
        assignId(type, 1L);
    }

    @Test
    void listEquipmentTypesTransformsToDto() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(type));

        List<EquipmentTypeDTO> result = equipmentTypeService.listEquipmentTypes();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Racks");
    }

    @Test
    void createEquipmentTypeRejectsDuplicateName() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(type));
        CreateEquipmentTypeRequest request = new CreateEquipmentTypeRequest();
        request.setName("Racks");

        assertThatThrownBy(() -> equipmentTypeService.createEquipmentType(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createEquipmentTypeRejectsBlankName() {
        CreateEquipmentTypeRequest request = new CreateEquipmentTypeRequest();
        request.setName(" ");

        assertThatThrownBy(() -> equipmentTypeService.createEquipmentType(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
    }

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

    @Test
    void getUniqueAttributesHandlesMissingEquipmentList() {
        type.setEquipmentList(null);
        when(equipmentTypeRepository.findById(1L)).thenReturn(java.util.Optional.of(type));

        assertThat(equipmentTypeService.getUniqueAttributes(1L)).isEmpty();
    }

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
