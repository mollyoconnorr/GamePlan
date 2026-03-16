package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.*;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment-types")
public class EquipmentTypeController {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final EquipmentRepository equipmentRepository;

    public EquipmentTypeController(EquipmentTypeRepository equipmentTypeRepository,
                                   EquipmentRepository equipmentRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.equipmentRepository = equipmentRepository;
    }

    /** List all equipment types */
    @GetMapping
    public List<EquipmentTypeDTO> getAllTypes() {
        return equipmentTypeRepository.findAll()
                .stream()
                .map(type -> new EquipmentTypeDTO(
                        type.getId(),
                        type.getName(),
                        type.getFieldSchema() != null && !type.getFieldSchema().isEmpty()
                ))
                .toList();
    }

    /** List all unique attributes for a given equipment type */
    @GetMapping("/{id}/attributes")
    public List<EquipmentAttributeDTO> getAttributesForType(@PathVariable Long id) {
        EquipmentType type = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment type not found with id: " + id));

        List<Equipment> equipments = type.getEquipmentList();

        return equipments.stream()
                .flatMap(e -> e.getAttributes().stream())
                .map(attr -> new EquipmentAttributeDTO(attr.getName(), attr.getValue()))
                .distinct() // requires equals/hashCode in DTO
                .toList();
    }

    /** List all equipment of a type optionally filtered by attribute */
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
}