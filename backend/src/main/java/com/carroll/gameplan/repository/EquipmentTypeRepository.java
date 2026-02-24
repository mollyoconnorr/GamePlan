package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {

    // Find an equipment type by its unique name
    Optional<EquipmentType> findByName(String name);
}