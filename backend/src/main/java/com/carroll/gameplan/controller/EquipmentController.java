package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.request.CreateEquipmentRequest;
import com.carroll.gameplan.dto.response.EquipmentDTO;
import com.carroll.gameplan.dto.request.EquipmentStatusUpdateRequest;
import com.carroll.gameplan.dto.response.EquipmentStatusUpdateResponse;
import com.carroll.gameplan.dto.request.EquipmentUpdateRequest;
import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.EquipmentAttribute;
import com.carroll.gameplan.model.EquipmentStatus;
import com.carroll.gameplan.model.EquipmentType;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.EquipmentRepository;
import com.carroll.gameplan.repository.EquipmentTypeRepository;
import com.carroll.gameplan.service.NotificationService;
import com.carroll.gameplan.service.ReservationService;
import com.carroll.gameplan.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
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
    private final UserService userService;
    private final ReservationService reservationService;
    private final NotificationService notificationService;
    private static final DateTimeFormatter NOTIFICATION_FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a");

    /**
     * Constructor for EquipmentController.
     *
     * @param equipmentRepository Repository for Equipment entities
     * @param equipmentTypeRepository Repository for EquipmentType entities
     */
    public EquipmentController(EquipmentRepository equipmentRepository,
                               EquipmentTypeRepository equipmentTypeRepository,
                               UserService userService,
                               ReservationService reservationService,
                               NotificationService notificationService) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.userService = userService;
        this.reservationService = reservationService;
        this.notificationService = notificationService;
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
    public List<EquipmentDTO> getAllEquipment(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentRepository.findAll()
                .stream()
                .map(this::toDto)
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
    public Equipment createEquipment(OAuth2AuthenticationToken authentication,
                                     @RequestBody CreateEquipmentRequest request) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

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

    @GetMapping("/{id}")
    public EquipmentDTO getEquipment(@PathVariable Long id,
                                     OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));

        return toDto(equipment);
    }

    @PutMapping("/{id}")
    @Transactional
    public EquipmentDTO updateEquipment(@PathVariable Long id,
                                        @RequestBody EquipmentUpdateRequest request,
                                        OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            equipment.setName(request.getName().trim());
        }

        if (request.getEquipmentTypeId() != null) {
            EquipmentType type = equipmentTypeRepository.findById(request.getEquipmentTypeId())
                    .orElseThrow(() -> new IllegalArgumentException("Equipment type not found: " + request.getEquipmentTypeId()));
            equipment.setEquipmentType(type);
        }

        List<EquipmentAttribute> newAttributes = new ArrayList<>();
        if (request.getAttributes() != null) {
            request.getAttributes().entrySet().stream()
                    .filter(entry -> entry.getKey() != null && !entry.getKey().isBlank())
                    .forEach(entry -> {
                        EquipmentAttribute attr = new EquipmentAttribute();
                        attr.setName(entry.getKey().trim());
                        attr.setValue(entry.getValue());
                        attr.setEquipment(equipment);
                        newAttributes.add(attr);
                    });
        }

        List<EquipmentAttribute> existingAttributes = equipment.getAttributes();
        if (existingAttributes == null) {
            existingAttributes = new ArrayList<>();
            equipment.setAttributes(existingAttributes);
        }
        existingAttributes.clear();
        existingAttributes.addAll(newAttributes);

        Equipment updated = equipmentRepository.save(equipment);
        return toDto(updated);
    }

    @PutMapping("/{id}/status")
    @Transactional
    public EquipmentStatusUpdateResponse updateEquipmentStatus(@PathVariable Long id,
                                              @RequestBody EquipmentStatusUpdateRequest request,
                                              OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));

        EquipmentStatus nextStatus;
        try {
            nextStatus = EquipmentStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid equipment status: " + request.getStatus());
        }
        int canceled = 0;
        if (EquipmentStatus.MAINTENANCE.equals(nextStatus)) {
            List<Reservation> activeReservations = reservationService.getActiveReservationsForEquipment(id);
            for (Reservation reservation : activeReservations) {
                String equipmentName = reservation.getEquipment() != null
                        ? reservation.getEquipment().getName()
                        : "equipment";
                String formattedStart = reservation.getStartDatetime().format(NOTIFICATION_FORMATTER);
                User reservationUser = reservation.getUser();

                reservationService.cancelReservation(reservation.getId(), user);
                cancelledMessage(reservationUser, equipmentName, formattedStart);
                canceled++;
            }
        }

        equipment.setStatus(nextStatus);
        Equipment updated = equipmentRepository.save(equipment);
        return new EquipmentStatusUpdateResponse(toDto(updated), canceled);
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
    public ResponseEntity<Void> deleteEquipment(@PathVariable Long id,
                                                OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);
        if (!equipmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        equipmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void cancelledMessage(User reservationUser, String equipmentName, String formattedStart) {
        if (reservationUser == null || equipmentName == null || formattedStart == null) {
            return;
        }

        String message = String.format(
                "Your reservation for %s on %s was cancelled because the equipment entered maintenance.",
                equipmentName,
                formattedStart
        );
        notificationService.createNotification(reservationUser, message);
    }

    private EquipmentDTO toDto(Equipment equipment) {
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(equipment.getId());
        dto.setName(equipment.getName());
        dto.setStatus(equipment.getStatus() != null ? equipment.getStatus().name() : null);
        dto.setTypeName(equipment.getEquipmentType() != null
                ? equipment.getEquipmentType().getName()
                : null);
        dto.setTypeId(equipment.getEquipmentType() != null
                ? equipment.getEquipmentType().getId()
                : null);

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
    }
}
