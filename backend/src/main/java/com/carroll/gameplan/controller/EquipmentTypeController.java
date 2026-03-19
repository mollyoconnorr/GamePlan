package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.*;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.service.EquipmentTypeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing Equipment Types.
 * <p>
 * Provides endpoints for listing, creating, deleting, and retrieving attributes
 * for equipment types, as well as listing equipment of a specific type.
 * </p>
 */
@RestController
@RequestMapping("/api/equipment-types")
public class EquipmentTypeController {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeService equipmentTypeService;

    /**
     * Constructor for EquipmentTypeController.
     *
     * @param equipmentTypeRepository Repository for EquipmentType entities
     * @param equipmentRepository     Repository for Equipment entities
     * @param equipmentTypeService    Service layer for EquipmentType business logic
     */
    public EquipmentTypeController(EquipmentTypeRepository equipmentTypeRepository,
                                   EquipmentRepository equipmentRepository,
                                   EquipmentTypeService equipmentTypeService) {
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeService = equipmentTypeService;
    }

    /**
     * GET /api/equipment-types
     * <p>
     * Returns a list of all equipment types.
     *
     * @return List of EquipmentTypeDTO objects
     */
    @GetMapping
    public List<EquipmentTypeDTO> getAllTypes() {
        return equipmentTypeRepository.findAll()
                .stream()
                .map(type -> new EquipmentTypeDTO(
                        type.getId(),
                        type.getName(),
                        type.getFieldSchema() != null && !type.getFieldSchema().isEmpty(),
                        type.getColor()
                ))
                .toList();
    }

    /**
     * GET /api/equipment-types/{id}/attributes
     * <p>
     * Returns all unique attributes for a given equipment type by aggregating
     * attributes from all equipment of this type.
     *
     * @param id ID of the EquipmentType
     * @return List of EquipmentAttributeDTO objects
     */
    @GetMapping("/{id}/attributes")
    public List<EquipmentAttributeDTO> getAttributesForType(@PathVariable Long id) {
        EquipmentType type = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment type not found with id: " + id));

        List<Equipment> equipments = type.getEquipmentList();

        return equipments.stream()
                .flatMap(e -> e.getAttributes().stream())
                .map(attr -> new EquipmentAttributeDTO(attr.getName(), attr.getValue()))
                .distinct()
                .toList();
    }

    /**
     * GET /api/equipment-types/{id}/attributes-all
     * <p>
     * Returns all attributes defined in the fieldSchema of the equipment type.
     *
     * @param id ID of the EquipmentType
     * @return List of EquipmentTypeAttributeDTO objects
     */
    @GetMapping("/{id}/attributes-all")
    public List<EquipmentTypeAttributeDTO> getAllAttributesForType(@PathVariable Long id) {
        return equipmentTypeService.getAllAttributes(id);
    }

    /**
     * GET /api/equipment-types/{typeId}/equipment
     * <p>
     * Returns all equipment of a given type, optionally filtered by attribute name and value.
     *
     * @param typeId    ID of the EquipmentType
     * @param attrName  Optional attribute name to filter equipment
     * @param attrValue Optional attribute value to filter equipment
     * @return List of EquipmentWithReservationsDTO objects
     */
    @GetMapping("/{typeId}/equipment")
    public List<EquipmentWithReservationsDTO> getEquipmentByTypeAndAttribute(
            @PathVariable Long typeId,
            @RequestParam(required = false) String attrName,
            @RequestParam(required = false) String attrValue) {

        return equipmentRepository.findByTypeAndAttribute(typeId, attrName, attrValue)
                .stream()
                .map(e -> new EquipmentWithReservationsDTO(
                        e.getId(),
                        e.getName(),
                        e.getAttributes().stream()
                                .map(a -> new EquipmentAttributeDTO(a.getName(), a.getValue()))
                                .toList(),
                        e.getReservations().stream()
                                .map(r -> new ReservationDTO(r.getId(), r.getStartDatetime(), r.getEndDatetime()))
                                .toList()
                ))
                .toList();
    }

    /**
     * POST /api/equipment-types
     * <p>
     * Creates a new equipment type.
     *
     * @param request Request object containing name, fieldSchema, and color
     * @return Created EquipmentTypeDTO object
     */
    @PostMapping
    public EquipmentTypeDTO createEquipmentType(@RequestBody CreateEquipmentTypeRequest request) {

        // Check for duplicate name
        if (equipmentTypeRepository.findAll().stream()
                .anyMatch(t -> t.getName().equalsIgnoreCase(request.getName()))) {
            throw new IllegalArgumentException("Equipment type already exists");
        }

        // Create entity
        EquipmentType type = new EquipmentType();
        type.setName(request.getName());
        type.setFieldSchema(request.getFieldSchema());
        type.setColor(request.getColor());

        // Save to DB
        EquipmentType saved = equipmentTypeRepository.save(type);

        return new EquipmentTypeDTO(
                saved.getId(),
                saved.getName(),
                saved.getFieldSchema() != null && !saved.getFieldSchema().isEmpty(),
                saved.getColor()
        );
    }

    /**
     * DELETE /api/equipment-types/{id}
     * <p>
     * Deletes an equipment type by ID. Returns 204 if successful, 409 if
     * equipment exists for this type, or 404 if not found.
     *
     * @param id ID of the EquipmentType to delete
     * @return ResponseEntity with appropriate status code
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipmentType(@PathVariable Long id) {
        try {
            equipmentTypeService.deleteEquipmentType(id);
            return ResponseEntity.noContent().build(); // 204
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // 409
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build(); // 404
        }
    }
}