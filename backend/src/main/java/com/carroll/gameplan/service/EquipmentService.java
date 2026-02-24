package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.repository.EquipmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * EquipmentService
 *
 * This service handles all business logic related to Equipment in the GamePlan application.
 * Responsibilities include:
 *   - Creating new equipment and assigning it an EquipmentType
 *   - Updating equipment properties, including status
 *   - Retrieving equipment by ID or name
 *   - Listing all equipment
 *   - Querying equipment by type or availability
 *
 * This service ensures proper interaction with the EquipmentRepository and maintains
 * consistency with the Equipment entity and its relationship to EquipmentType.
 */
@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;

    public EquipmentService(EquipmentRepository equipmentRepository) {
        this.equipmentRepository = equipmentRepository;
    }

    /**
     * Create a new equipment item
     */
    public Equipment createEquipment(String name,
                                     EquipmentType equipmentType,
                                     Integer minTime,
                                     Integer maxTime,
                                     Integer stepMin,
                                     Integer minResLength,
                                     Integer maxResLength,
                                     Integer defaultResLength,
                                     EquipmentStatus status) {
        Equipment equipment = new Equipment();
        equipment.setName(name);
        equipment.setEquipmentType(equipmentType);
        equipment.setMinTime(minTime);
        equipment.setMaxTime(maxTime);
        equipment.setStepMin(stepMin);
        equipment.setMinResLength(minResLength);
        equipment.setMaxResLength(maxResLength);
        equipment.setDefaultResLength(defaultResLength);
        equipment.setStatus(status);
        return equipmentRepository.save(equipment);
    }

    /**
     * Update an existing equipment item
     */
    public Equipment updateEquipment(Equipment equipment,
                                     String name,
                                     EquipmentType equipmentType,
                                     Integer minTime,
                                     Integer maxTime,
                                     Integer stepMin,
                                     Integer minResLength,
                                     Integer maxResLength,
                                     Integer defaultResLength,
                                     EquipmentStatus status) {
        equipment.setName(name);
        equipment.setEquipmentType(equipmentType);
        equipment.setMinTime(minTime);
        equipment.setMaxTime(maxTime);
        equipment.setStepMin(stepMin);
        equipment.setMinResLength(minResLength);
        equipment.setMaxResLength(maxResLength);
        equipment.setDefaultResLength(defaultResLength);
        equipment.setStatus(status);
        return equipmentRepository.save(equipment);
    }

    /**
     * Find equipment by ID
     */
    public Optional<Equipment> findById(Long id) {
        return equipmentRepository.findById(id);
    }

    /**
     * Find equipment by name
     */
    public Optional<Equipment> findByName(String name) {
        return equipmentRepository.findByName(name);
    }

    /**
     * List all equipment
     */
    public List<Equipment> getAllEquipment() {
        return equipmentRepository.findAll();
    }

    /**
     * List all equipment of a specific type
     */
    public List<Equipment> getByType(EquipmentType equipmentType) {
        return equipmentRepository.findByEquipmentType(equipmentType);
    }

    /**
     * List all available equipment
     */
    public List<Equipment> getAvailableEquipment() {
        return equipmentRepository.findByStatus(EquipmentStatus.AVAILABLE);
    }
}
