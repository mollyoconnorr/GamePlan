package com.carroll.gameplan.service;

import com.carroll.gameplan.dto.EquipmentTypeAttributeDTO;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service class for handling business logic related to {@link EquipmentType}.
 * <p>
 * This includes parsing dynamic attribute schemas, retrieving attribute definitions,
 * and enforcing rules such as preventing deletion when equipment exists.
 * </p>
 */
@Service
public class EquipmentTypeService {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final EquipmentRepository equipmentRepository;

    /**
     * Constructor for dependency injection.
     *
     * @param equipmentTypeRepository repository for EquipmentType entities
     */
    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository,
                                EquipmentRepository equipmentRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.equipmentRepository = equipmentRepository;
    }

    /**
     * Parses a JSON field schema and converts it into a list of attribute DTOs.
     * <p>
     * Each field in the JSON schema represents an attribute, optionally containing
     * a list of allowed values under the "options" key.
     * </p>
     *
     * <p><b>Example schema:</b></p>
     * <pre>
     * {
     *   "size": { "options": ["S", "M", "L"] },
     *   "color": { "options": ["red", "blue"] }
     * }
     * </pre>
     *
     * <p><b>Result:</b></p>
     * A list of {@link EquipmentTypeAttributeDTO} objects:
     * <ul>
     *   <li>name = "size", options = ["S", "M", "L"]</li>
     *   <li>name = "color", options = ["red", "blue"]</li>
     * </ul>
     *
     * @param fieldSchema JSON schema string defining attributes
     * @return list of parsed attribute DTOs (empty if parsing fails)
     */
    public List<EquipmentTypeAttributeDTO> getAttributesFromSchema(String fieldSchema) {
        List<EquipmentTypeAttributeDTO> attributes = new ArrayList<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode schema = mapper.readTree(fieldSchema);

            schema.fields().forEachRemaining(field -> {
                String name = field.getKey();
                JsonNode attrNode = field.getValue();

                List<String> options = new ArrayList<>();
                if (attrNode.has("options")) {
                    attrNode.get("options").forEach(n -> options.add(n.asText()));
                }

                attributes.add(new EquipmentTypeAttributeDTO(name, options));
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
        return attributes;
    }

    /**
     * Retrieves all attribute definitions for a given equipment type.
     * <p>
     * This method loads the EquipmentType from the database and parses its
     * JSON schema into a structured list of attributes.
     * </p>
     *
     * @param equipmentTypeId ID of the equipment type
     * @return list of attribute DTOs
     * @throws RuntimeException if the equipment type is not found
     */
    public List<EquipmentTypeAttributeDTO> getAllAttributes(Long equipmentTypeId) {
        EquipmentType type = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new RuntimeException("EquipmentType not found"));

        return getAttributesFromSchema(type.getFieldSchema());
    }

    /**
     * Deletes an equipment type if no equipment is associated with it.
     * <p>
     * Business rule:
     * <ul>
     *   <li>If equipment exists for this type → throw exception (409 Conflict)</li>
     *   <li>If not found → throw exception (404 Not Found)</li>
     * </ul>
     * </p>
     *
     * @param id ID of the equipment type to delete
     * @throws RuntimeException      if the equipment type is not found
     * @throws IllegalStateException if equipment exists for this type
     */
    public void deleteEquipmentType(Long id) {
        EquipmentType type = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EquipmentType not found"));

        // Check if any equipment is attached
        if (!type.getEquipmentList().isEmpty()) {
            throw new IllegalStateException("Cannot delete type: equipment exists");
        }

        equipmentTypeRepository.delete(type);
    }

    /**
     * Deletes an equipment type along with all related equipment and reservations.
     *
     * @param id ID of the equipment type
     */
    public void forceDeleteEquipmentType(Long id) {
        EquipmentType type = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EquipmentType not found"));

        // Delete every equipment that belongs to this type; cascade removes reservations.
        equipmentRepository.deleteAll(type.getEquipmentList());
        equipmentTypeRepository.delete(type);
    }
}
