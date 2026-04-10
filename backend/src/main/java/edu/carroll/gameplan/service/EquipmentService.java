package edu.carroll.gameplan.service;

import edu.carroll.gameplan.dto.request.CreateEquipmentRequest;
import edu.carroll.gameplan.dto.response.EquipmentDTO;
import edu.carroll.gameplan.dto.request.EquipmentStatusUpdateRequest;
import edu.carroll.gameplan.dto.request.EquipmentUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentStatusUpdateResponse;
import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentAttribute;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.EquipmentType;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.EquipmentTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service responsible for equipment operations, including creation, updates, deletions, and status
 * transitions. Handles DTO mapping and notification dispatch for maintenance cancellations.
 */
@Service
public class EquipmentService {

    private static final DateTimeFormatter NOTIFICATION_FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a", Locale.ENGLISH);

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;
    private final ReservationService reservationService;
    private final NotificationService notificationService;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            EquipmentTypeRepository equipmentTypeRepository,
                            ReservationService reservationService,
                            NotificationService notificationService) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.reservationService = reservationService;
        this.notificationService = notificationService;
    }

    /**
     * Lists all equipment as DTOs for presentation.
     */
    public List<EquipmentDTO> listAllEquipment() {
        return equipmentRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Retrieves a single equipment DTO by ID.
     */
    public EquipmentDTO getEquipment(Long id) {
        return toDto(fetchEquipment(id));
    }

    /**
     * Creates a new equipment entry based on the supplied request.
     */
    @Transactional
    public EquipmentDTO createEquipment(CreateEquipmentRequest request) {
        EquipmentType type = resolveEquipmentType(request.getEquipmentTypeId());
        Equipment equipment = new Equipment();
        equipment.setName(request.getName());
        equipment.setEquipmentType(type);
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setAttributes(buildAttributes(request.getAttributes(), equipment));
        return toDto(equipmentRepository.save(equipment));
    }

    /**
     * Updates an existing equipment record with new metadata.
     */
    @Transactional
    public EquipmentDTO updateEquipment(Long id, EquipmentUpdateRequest request) {
        Equipment equipment = fetchEquipment(id);

        if (request.getName() != null && !request.getName().isBlank()) {
            equipment.setName(request.getName().trim());
        }

        if (request.getEquipmentTypeId() != null) {
            EquipmentType type = resolveEquipmentType(request.getEquipmentTypeId());
            equipment.setEquipmentType(type);
        }

        List<EquipmentAttribute> updatedAttributes = buildAttributes(request.getAttributes(), equipment);
        if (equipment.getAttributes() == null) {
            equipment.setAttributes(new ArrayList<>());
        }
        equipment.getAttributes().clear();
        equipment.getAttributes().addAll(updatedAttributes);

        return toDto(equipmentRepository.save(equipment));
    }

    /**
     * Updates the status of equipment, cancelling reservations when entering maintenance.
     */
    @Transactional
    public EquipmentStatusUpdateResponse updateEquipmentStatus(Long id,
                                                               EquipmentStatusUpdateRequest request,
                                                               User actingUser) {
        Equipment equipment = fetchEquipment(id);
        EquipmentStatus nextStatus = parseStatus(request.getStatus());

        int canceled = 0;
        if (EquipmentStatus.MAINTENANCE.equals(nextStatus)) {
            canceled = cancelActiveReservationsForMaintenance(equipment, actingUser);
        }

        equipment.setStatus(nextStatus);
        return new EquipmentStatusUpdateResponse(toDto(equipmentRepository.save(equipment)), canceled);
    }

    /**
     * Deletes equipment if it exists.
     */
    @Transactional
    public boolean deleteEquipment(Long id) {
        if (!equipmentRepository.existsById(id)) {
            return false;
        }
        equipmentRepository.deleteById(id);
        return true;
    }

    private Equipment fetchEquipment(Long id) {
        return equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
    }

    private EquipmentType resolveEquipmentType(Long typeId) {
        if (typeId == null) {
            throw new IllegalArgumentException("Equipment type is required");
        }
        return equipmentTypeRepository.findById(typeId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid equipment type: " + typeId));
    }

    private List<EquipmentAttribute> buildAttributes(Map<String, String> attributes, Equipment equipment) {
        List<EquipmentAttribute> result = new ArrayList<>();
        if (attributes == null) {
            return result;
        }

        for (Map.Entry<String, String> entry : attributes.entrySet()) {
            if (entry.getKey() == null || entry.getKey().isBlank()) {
                continue;
            }
            EquipmentAttribute attr = new EquipmentAttribute();
            attr.setName(entry.getKey().trim());
            attr.setValue(entry.getValue());
            attr.setEquipment(equipment);
            result.add(attr);
        }
        return result;
    }

    private EquipmentStatus parseStatus(String statusValue) {
        if (statusValue == null) {
            throw new IllegalArgumentException("Status is required");
        }
        try {
            return EquipmentStatus.valueOf(statusValue);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid equipment status: " + statusValue);
        }
    }

    private int cancelActiveReservationsForMaintenance(Equipment equipment, User actingUser) {
        List<Reservation> activeReservations = reservationService.getActiveReservationsForEquipment(equipment.getId());
        int cancelled = 0;
        for (Reservation reservation : activeReservations) {
            reservationService.cancelReservation(reservation.getId(), actingUser);
            sendCancelledMessage(reservation);
            cancelled++;
        }
        return cancelled;
    }

    private void sendCancelledMessage(Reservation reservation) {
        if (reservation == null || reservation.getUser() == null || reservation.getEquipment() == null) {
            return;
        }
        String equipmentName = reservation.getEquipment().getName();
        String formattedStart = reservation.getStartDatetime().format(NOTIFICATION_FORMATTER);
        String message = String.format(
                "Your reservation for %s on %s was cancelled because the equipment entered maintenance.",
                equipmentName,
                formattedStart
        );
        notificationService.createNotification(reservation.getUser(), message);
    }

    private EquipmentDTO toDto(Equipment equipment) {
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(equipment.getId());
        dto.setName(equipment.getName());
        dto.setStatus(equipment.getStatus() != null ? equipment.getStatus().name() : null);
        EquipmentType type = equipment.getEquipmentType();
        if (type != null) {
            dto.setTypeId(type.getId());
            dto.setTypeName(type.getName());
        }
        if (equipment.getAttributes() != null) {
            List<EquipmentDTO.AttributeDTO> attrList = new ArrayList<>();
            for (EquipmentAttribute attr : equipment.getAttributes()) {
                EquipmentDTO.AttributeDTO attrDTO = new EquipmentDTO.AttributeDTO();
                attrDTO.setName(attr.getName());
                attrDTO.setValue(attr.getValue());
                attrList.add(attrDTO);
            }
            dto.setAttributes(attrList);
        }
        return dto;
    }
}
