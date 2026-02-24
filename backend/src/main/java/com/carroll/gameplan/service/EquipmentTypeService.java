package com.carroll.gameplan.service;

import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * EquipmentTypeService
 *
 * This service handles all business logic related to equipment types in the GamePlan application.
 * Responsibilities include:
 *   - Creating new equipment types
 *   - Updating existing equipment types
 *   - Retrieving equipment types by ID or name
 *   - Listing all equipment types
 *
 * This service ensures proper interaction with the EquipmentTypeRepository and maintains
 * consistency with the EquipmentType entity.
 */
@Service
public class EquipmentTypeService {

    private final EquipmentTypeRepository equipmentTypeRepository;

    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    /**
     * Create a new equipment type
     */
    public EquipmentType createEquipmentType(String name, String fieldSchema) {
        EquipmentType type = new EquipmentType();
        type.setName(name);
        type.setFieldSchema(fieldSchema);
        return equipmentTypeRepository.save(type);
    }

    /**
     * Update an existing equipment type
     */
    public EquipmentType updateEquipmentType(EquipmentType type, String newName, String newFieldSchema) {
        type.setName(newName);
        type.setFieldSchema(newFieldSchema);
        return equipmentTypeRepository.save(type);
    }

    /**
     * Find an equipment type by ID
     */
    public Optional<EquipmentType> findById(Long id) {
        return equipmentTypeRepository.findById(id);
    }

    /**
     * Find an equipment type by name
     */
    public Optional<EquipmentType> findByName(String name) {
        return equipmentTypeRepository.findByName(name);
    }

    /**
     * List all equipment types
     */
    public List<EquipmentType> getAllEquipmentTypes() {
        return equipmentTypeRepository.findAll();
    }
}
