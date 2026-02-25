package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for managing EquipmentType entities.
 * <p>
 * Provides CRUD operations via JpaRepository and
 * a custom query to find equipment types by name.
 * </p>
 */
@Repository
public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {

    /**
     * Finds an EquipmentType entity by its unique name.
     *
     * @param name the name of the equipment type
     * @return an Optional containing the EquipmentType if found, otherwise empty
     */
    Optional<EquipmentType> findByName(String name);
}