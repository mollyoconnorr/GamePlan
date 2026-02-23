package com.carroll.gameplan;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class EquipmentRepositoryTest {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;

    private EquipmentType treadmillType;
    private Equipment treadmill;
    private Equipment bike;

    @BeforeEach
    void setup() {
        // Create EquipmentType
        treadmillType = new EquipmentType();
        treadmillType.setName("Treadmill");
        treadmillType = equipmentTypeRepository.save(treadmillType);

        EquipmentType bikeType = new EquipmentType();
        bikeType.setName("Bike");
        bikeType = equipmentTypeRepository.save(bikeType);

        // Create Equipment #1
        treadmill = new Equipment();
        treadmill.setName("Treadmill #1");
        treadmill.setStatus(EquipmentStatus.AVAILABLE);
        treadmill.setEquipmentType(treadmillType);
        treadmill = equipmentRepository.save(treadmill);

        // Create Equipment #2
        bike = new Equipment();
        bike.setName("Bike #1");
        bike.setStatus(EquipmentStatus.OUT_OF_SERVICE);
        bike.setEquipmentType(bikeType);
        bike = equipmentRepository.save(bike);
    }

    @Test
    void shouldSaveAndFindEquipment() {
        Equipment found = equipmentRepository.findById(treadmill.getId()).orElse(null);

        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Treadmill #1");
        assertThat(found.getStatus()).isEqualTo(EquipmentStatus.AVAILABLE);
    }

    @Test
    void shouldFindEquipmentByStatus() {
        List<Equipment> available = equipmentRepository.findByStatus(EquipmentStatus.AVAILABLE);
        List<Equipment> outOfService = equipmentRepository.findByStatus(EquipmentStatus.OUT_OF_SERVICE);

        assertThat(available).hasSize(1).extracting("name").containsExactly("Treadmill #1");
        assertThat(outOfService).hasSize(1).extracting("name").containsExactly("Bike #1");
    }

    @Test
    void shouldFindEquipmentByTypeName() {
        List<Equipment> treadmills = equipmentRepository.findByEquipmentType_Name("Treadmill");
        List<Equipment> bikes = equipmentRepository.findByEquipmentType_Name("Bike");

        assertThat(treadmills).hasSize(1).extracting("name").containsExactly("Treadmill #1");
        assertThat(bikes).hasSize(1).extracting("name").containsExactly("Bike #1");
    }

    @Test
    void shouldFindEquipmentByTypeObject() {
        List<Equipment> treadmills = equipmentRepository.findByEquipmentType(treadmillType);

        assertThat(treadmills).hasSize(1).extracting("name").containsExactly("Treadmill #1");
    }
}
