package com.carroll.gameplan;

import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class EquipmentTypeRepositoryTest {

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    private EquipmentType treadmillType;
    private EquipmentType bikeType;

    @BeforeEach
    void setup() {
        treadmillType = new EquipmentType();
        treadmillType.setName("Treadmill");
        treadmillType = equipmentTypeRepository.save(treadmillType);

        bikeType = new EquipmentType();
        bikeType.setName("Bike");
        bikeType = equipmentTypeRepository.save(bikeType);
    }

    @Test
    void shouldSaveAndFindEquipmentType() {
        EquipmentType found = equipmentTypeRepository.findById(treadmillType.getId()).orElse(null);

        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Treadmill");
    }

    @Test
    void shouldFindAllEquipmentTypes() {
        List<EquipmentType> allTypes = equipmentTypeRepository.findAll();

        assertThat(allTypes).hasSize(2)
                .extracting("name")
                .containsExactlyInAnyOrder("Treadmill", "Bike");
    }

    @Test
    void shouldDeleteEquipmentType() {
        equipmentTypeRepository.delete(bikeType);
        List<EquipmentType> remaining = equipmentTypeRepository.findAll();

        assertThat(remaining).hasSize(1)
                .extracting("name")
                .containsExactly("Treadmill");
    }
}
