package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    // Find by enum status (AVAILABLE, UNAVAILABLE, etc.)
    List<Equipment> findByStatus(EquipmentStatus status);

    // Find by EquipmentType name
    List<Equipment> findByEquipmentType_Name(String name);

    // Find by EquipmentType object
    List<Equipment> findByEquipmentType(EquipmentType equipmentType);

    Optional<Equipment> findByName(String name);
}
