package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for managing Equipment entities.
 * <p>
 * Provides standard CRUD operations via JpaRepository.
 * Custom queries can be added here as needed.
 * </p>
 */
@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    // Additional custom queries for Equipment can be added here if needed
}
