package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.CreateEquipmentRequest;
import com.carroll.gameplan.dto.EquipmentDTO;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentAttribute;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST controller for managing Equipment.
 * <p>
 * Provides endpoints for listing all equipment, creating new equipment,
 * and deleting equipment by ID.
 * </p>
 */
@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;

    /**
     * Constructor for EquipmentController.
     *
     * @param equipmentRepository Repository for Equipment entities
     * @param equipmentTypeRepository Repository for EquipmentType entities
     */
    public EquipmentController(EquipmentRepository equipmentRepository,
                               EquipmentTypeRepository equipmentTypeRepository) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    /**
     * GET /api/equipment
     * <p>
     * Returns all equipment as a list of EquipmentDTOs.
     * Includes attributes and type information.
     *
     * @return List of EquipmentDTO objects
     */
    @GetMapping
    public List<EquipmentDTO> getAllEquipment() {
        return equipmentRepository.findAll()
                .stream()
                .map(equipment -> {
                    EquipmentDTO dto = new EquipmentDTO();
                    dto.setId(equipment.getId());
                    dto.setName(equipment.getName());
                    dto.setStatus(equipment.getStatus() != null ? equipment.getStatus().name() : null);
                    dto.setTypeName(equipment.getEquipmentType() != null
                            ? equipment.getEquipmentType().getName()
                            : null);

                    // Map attributes if they exist
                    if (equipment.getAttributes() != null) {
                        List<EquipmentDTO.AttributeDTO> attrList = equipment.getAttributes()
                                .stream()
                                .map(attr -> {
                                    EquipmentDTO.AttributeDTO attrDTO = new EquipmentDTO.AttributeDTO();
                                    attrDTO.setName(attr.getName());
                                    attrDTO.setValue(attr.getValue());
                                    return attrDTO;
                                })
                                .toList();
                        dto.setAttributes(attrList);
                    }

                    return dto;
                })
                .toList();
    }

    /**
     * POST /api/equipment
     * <p>
     * Creates a new equipment entity with the specified name, type, and attributes.
     * Sets the default status to AVAILABLE.
     *
     * @param request CreateEquipmentRequest containing name, typeId, and attributes
     * @return The saved Equipment entity
     */
    @PostMapping
    public Equipment createEquipment(@RequestBody CreateEquipmentRequest request) {

        // 1. Get EquipmentType
        EquipmentType type = equipmentTypeRepository.findById(request.getEquipmentTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid equipment type"));

        // 2. Create Equipment
        Equipment equipment = new Equipment();
        equipment.setName(request.getName());
        equipment.setEquipmentType(type);
        equipment.setStatus(EquipmentStatus.AVAILABLE); // default

        // 3. Create attributes
        List<EquipmentAttribute> attributeList = new ArrayList<>();

        if (request.getAttributes() != null) {
            for (Map.Entry<String, String> entry : request.getAttributes().entrySet()) {
                EquipmentAttribute attr = new EquipmentAttribute();
                attr.setName(entry.getKey());
                attr.setValue(entry.getValue());
                attr.setEquipment(equipment);
                attributeList.add(attr);
            }
        }

        equipment.setAttributes(attributeList);
        return equipmentRepository.save(equipment);
    }

    /**
     * DELETE /api/equipment/{id}
     * <p>
     * Deletes an equipment entity by its ID.
     *
     * @param id ID of the Equipment to delete
     * @return ResponseEntity with 204 if deleted, 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable Long id) {
        if (!equipmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        equipmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}