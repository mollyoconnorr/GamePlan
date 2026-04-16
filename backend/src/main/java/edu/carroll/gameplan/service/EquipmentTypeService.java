package edu.carroll.gameplan.service;

import edu.carroll.gameplan.dto.request.CreateEquipmentTypeRequest;
import edu.carroll.gameplan.dto.request.EquipmentTypeUpdateRequest;
import edu.carroll.gameplan.dto.response.*;
import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentAttribute;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.EquipmentType;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.time.LocalDateTime;

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
    private final ReservationRepository reservationRepository;

    /**
     * Constructor for dependency injection.
     *
     * @param equipmentTypeRepository repository for EquipmentType entities
     */
    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository,
                                EquipmentRepository equipmentRepository,
                                ReservationRepository reservationRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.equipmentRepository = equipmentRepository;
        this.reservationRepository = reservationRepository;
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

            schema.properties().forEach(field -> {
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
     * Lists all equipment types available in the application.
     *
     * @return list of equipment type DTOs
     */
    public List<EquipmentTypeDTO> listEquipmentTypes() {
        return equipmentTypeRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Creates a new equipment type from the provided request.
     */
    public EquipmentTypeDTO createEquipmentType(CreateEquipmentTypeRequest request) {
        String name = requireName(request.getName());
        ensureNameAvailable(name, null);

        EquipmentType type = new EquipmentType();
        type.setName(name);
        type.setFieldSchema(trimToNull(request.getFieldSchema()));
        type.setColor(trimToNull(request.getColor()));

        return toDto(equipmentTypeRepository.save(type));
    }

    /**
     * Updates the metadata of an existing equipment type.
     */
    @Transactional
    public EquipmentTypeDTO updateEquipmentType(Long id, EquipmentTypeUpdateRequest request) {
        EquipmentType type = fetchEquipmentType(id);

        if (request.getName() != null && !request.getName().isBlank()) {
            String trimmed = request.getName().trim();
            ensureNameAvailable(trimmed, id);
            type.setName(trimmed);
        }

        if (request.getColor() != null) {
            type.setColor(trimToNull(request.getColor()));
        }

        if (request.getFieldSchema() != null) {
            String nextFieldSchema = trimToNull(request.getFieldSchema());
            applyDefaultsForNewAttributes(type, nextFieldSchema);
            type.setFieldSchema(nextFieldSchema);
        }

        return toDto(equipmentTypeRepository.save(type));
    }

    /**
     * Returns every attribute value stored on equipment of this type.
     */
    public List<EquipmentAttributeDTO> getUniqueAttributes(Long id) {
        EquipmentType type = fetchEquipmentType(id);
        if (type.getEquipmentList() == null) {
            return List.of();
        }

        return type.getEquipmentList().stream()
                .filter(e -> e.getAttributes() != null)
                .flatMap(e -> e.getAttributes().stream())
                .map(attr -> new EquipmentAttributeDTO(attr.getName(), attr.getValue()))
                .distinct()
                .toList();
    }

    /**
     * Returns equipment along with existing reservations, optionally filtering by attribute.
     */
    public List<EquipmentWithReservationsDTO> getAvailableEquipmentWithReservations(Long typeId,
                                                                           String attrName,
                                                                           String attrValue) {
        return equipmentRepository.findByTypeAndAttributeAndStatus(typeId, attrName, attrValue, EquipmentStatus.AVAILABLE)
                .stream()
                .map(this::toEquipmentWithReservations)
                .toList();
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

    private EquipmentType fetchEquipmentType(Long id) {
        return equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EquipmentType not found"));
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Equipment type name is required");
        }
        return name.trim();
    }

    private void ensureNameAvailable(String name, Long ignoreId) {
        boolean taken = equipmentTypeRepository.findAll().stream()
                .anyMatch(existing -> !Objects.equals(existing.getId(), ignoreId)
                        && existing.getName().equalsIgnoreCase(name));
        if (taken) {
            throw new IllegalArgumentException("Equipment type name already exists");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void applyDefaultsForNewAttributes(EquipmentType type, String nextFieldSchema) {
        if (type == null || nextFieldSchema == null || nextFieldSchema.isBlank()) {
            return;
        }

        List<EquipmentTypeAttributeDTO> previousAttributes = getAttributesFromSchema(type.getFieldSchema());
        List<EquipmentTypeAttributeDTO> nextAttributes = getAttributesFromSchema(nextFieldSchema);
        if (nextAttributes.isEmpty()) {
            return;
        }

        Set<String> previousNames = previousAttributes.stream()
                .map(EquipmentTypeAttributeDTO::name)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        List<EquipmentTypeAttributeDTO> newAttributes = nextAttributes.stream()
                .filter(attribute -> attribute.name() != null && !previousNames.contains(attribute.name()))
                .toList();

        if (newAttributes.isEmpty() || type.getEquipmentList() == null || type.getEquipmentList().isEmpty()) {
            return;
        }

        boolean updatedAnyEquipment = false;
        for (Equipment equipment : type.getEquipmentList()) {
            if (equipment == null) {
                continue;
            }

            if (equipment.getAttributes() == null) {
                equipment.setAttributes(new ArrayList<>());
            }

            Set<String> existingAttributeNames = new HashSet<>();
            equipment.getAttributes().forEach((attribute) -> {
                if (attribute.getName() != null) {
                    existingAttributeNames.add(attribute.getName());
                }
            });

            for (EquipmentTypeAttributeDTO newAttribute : newAttributes) {
                String attributeName = newAttribute.name();
                if (attributeName == null || existingAttributeNames.contains(attributeName)) {
                    continue;
                }

                String defaultValue = newAttribute.options() == null
                        ? ""
                        : newAttribute.options().stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(option -> !option.isEmpty())
                        .findFirst()
                        .orElse("");

                EquipmentAttribute equipmentAttribute = new EquipmentAttribute();
                equipmentAttribute.setName(attributeName);
                equipmentAttribute.setValue(defaultValue);
                equipmentAttribute.setEquipment(equipment);
                equipment.getAttributes().add(equipmentAttribute);
                existingAttributeNames.add(attributeName);
                updatedAnyEquipment = true;
            }
        }

        if (updatedAnyEquipment) {
            equipmentRepository.saveAll(type.getEquipmentList());
        }
    }

    private EquipmentTypeDTO toDto(EquipmentType type) {
        return new EquipmentTypeDTO(
                type.getId(),
                type.getName(),
                type.getFieldSchema() != null && !type.getFieldSchema().isBlank(),
                type.getColor(),
                type.getFieldSchema()
        );
    }

    private EquipmentWithReservationsDTO toEquipmentWithReservations(Equipment equipment) {
        List<EquipmentAttributeDTO> attributes = equipment.getAttributes() == null
                ? List.of()
                : equipment.getAttributes().stream()
                .map(attr -> new EquipmentAttributeDTO(attr.getName(), attr.getValue()))
                .toList();

        List<Reservation> activeReservations = equipment.getId() == null
                ? List.of()
                : reservationRepository.findByEquipmentIdAndEndDatetimeAfterAndStatusIs(
                        equipment.getId(),
                        LocalDateTime.now(),
                        ReservationStatus.ACTIVE
                );

        List<ReservationDTO> reservations = activeReservations.stream()
                .map(res -> new ReservationDTO(res.getId(), res.getStartDatetime(), res.getEndDatetime()))
                .toList();

        return new EquipmentWithReservationsDTO(equipment.getId(), equipment.getName(), attributes, reservations);
    }
}
