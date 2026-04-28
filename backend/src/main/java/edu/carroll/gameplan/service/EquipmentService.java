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
import edu.carroll.gameplan.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service responsible for equipment operations, including creation, updates, deletions, and status
 * transitions. Centralizes DTO mapping and notification dispatch so maintenance cancellations stay
 * consistent across inventory workflows.
 */
@Service
public class EquipmentService {
    private static final Logger logger = LoggerFactory.getLogger(EquipmentService.class);

    private static final DateTimeFormatter NOTIFICATION_FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a", Locale.ENGLISH);

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final NotificationService notificationService;

    /**
     * Creates an equipment service with repositories and services needed for inventory updates and cancellation notifications.
     */
    public EquipmentService(EquipmentRepository equipmentRepository,
                            EquipmentTypeRepository equipmentTypeRepository,
                            ReservationRepository reservationRepository,
                            ReservationService reservationService,
                            NotificationService notificationService) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.reservationRepository = reservationRepository;
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
        Equipment saved = equipmentRepository.save(equipment);
        logger.info(
                "Equipment created: equipmentId={}, typeId={}, name={}",
                saved.getId(),
                type.getId(),
                saved.getName()
        );
        return toDto(saved);
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

        Equipment saved = equipmentRepository.save(equipment);
        logger.info(
                "Equipment updated: equipmentId={}, typeId={}, name={}",
                saved.getId(),
                saved.getEquipmentType() != null ? saved.getEquipmentType().getId() : null,
                saved.getName()
        );
        return toDto(saved);
    }

    /**
     * Updates the status of equipment, cancelling reservations when entering maintenance.
     */
    @Transactional
    public EquipmentStatusUpdateResponse updateEquipmentStatus(Long id,
                                                               EquipmentStatusUpdateRequest request,
                                                               User actingUser) {
        Equipment equipment = fetchEquipment(id);
        EquipmentStatus previousStatus = equipment.getStatus();
        EquipmentStatus nextStatus = parseStatus(request.getStatus());

        int canceled = 0;
        if (EquipmentStatus.MAINTENANCE.equals(nextStatus)) {
            canceled = cancelActiveReservationsForMaintenance(equipment, actingUser);
        }

        equipment.setStatus(nextStatus);
        Equipment saved = equipmentRepository.save(equipment);
        logger.info(
                "Equipment status updated: equipmentId={}, previousStatus={}, newStatus={}, actingUserId={}, cancelledReservations={}",
                saved.getId(),
                previousStatus,
                nextStatus,
                actingUser != null ? actingUser.getId() : null,
                canceled
        );
        return new EquipmentStatusUpdateResponse(toDto(saved), canceled);
    }

    /**
     * Deletes equipment if it exists.
     */
    @Transactional
    public boolean deleteEquipment(Long id, User actingUser) {
        Equipment equipment = equipmentRepository.findById(id).orElse(null);
        if (equipment == null) {
            logger.warn("Equipment delete requested for missing equipment: equipmentId={}", id);
            return false;
        }

        List<Reservation> activeReservations = reservationService.getActiveReservationsForEquipment(id);
        int cancelledReservations = activeReservations.size();
        for (Reservation reservation : activeReservations) {
            reservationService.cancelReservation(reservation.getId(), actingUser);
        }

        if (!activeReservations.isEmpty()) {
            reservationRepository.deleteAll(activeReservations);
            reservationRepository.flush();
        }

        equipmentRepository.delete(equipment);
        logger.info(
                "Equipment deleted: equipmentId={}, actingUserId={}, cancelledReservations={}",
                id,
                actingUser != null ? actingUser.getId() : null,
                cancelledReservations
        );
        return true;
    }

    /**
     * Loads an equipment entity or raises a clear error when the id is unknown.
     */
    private Equipment fetchEquipment(Long id) {
        return equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
    }

    /**
     * Resolves equipment type from request or application context.
     */
    private EquipmentType resolveEquipmentType(Long typeId) {
        if (typeId == null) {
            throw new IllegalArgumentException("Equipment type is required");
        }
        return equipmentTypeRepository.findById(typeId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid equipment type: " + typeId));
    }

    /**
     * Builds equipment attribute entities from request data and attaches them to the owning equipment.
     */
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

    /**
     * Converts a status string from the API into an EquipmentStatus enum with a clear error for invalid values.
     */
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

    /**
     * Cancels active reservations when equipment becomes unavailable for maintenance.
     */
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

    /**
     * Creates the notification shown when maintenance cancels an equipment reservation.
     */
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

    /**
     * Maps an equipment entity into the DTO returned by equipment endpoints.
     */
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
