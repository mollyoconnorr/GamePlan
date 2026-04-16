package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.*;
import edu.carroll.gameplan.repository.AppSettingsRepository;
import edu.carroll.gameplan.repository.EquipmentRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Service class for managing reservations.
 * <p>
 * Handles CRUD operations for {@link Reservation}, including creating, updating,
 * canceling, and fetching reservations for a user. Also handles equipment availability checks.
 * </p>
 */
@Service
public class ReservationService {
    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);

    private static final DateTimeFormatter NOTIFICATION_FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a", Locale.ENGLISH);
    private static final Long APP_SETTINGS_ID = 1L;

    private final ReservationRepository reservationRepository;
    private final EquipmentRepository equipmentRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final ScheduleBlockService scheduleBlockService;
    private final NotificationService notificationService;

    /**
     * Constructor injection of repositories.
     *
     * @param reservationRepository repository for Reservation entities
     * @param equipmentRepository   repository for Equipment entities
     */
    public ReservationService(ReservationRepository reservationRepository,
                              EquipmentRepository equipmentRepository,
                              AppSettingsRepository appSettingsRepository,
                              ScheduleBlockService scheduleBlockService,
                              NotificationService notificationService) {
        this.reservationRepository = reservationRepository;
        this.equipmentRepository = equipmentRepository;
        this.appSettingsRepository = appSettingsRepository;
        this.scheduleBlockService = scheduleBlockService;
        this.notificationService = notificationService;
    }


    /**
     * Returns all reservations for a given user that are active.
     *
     * @param user the user whose reservations to fetch
     * @return list of reservations
     */
    public List<Reservation> getActiveReservationsForUser(User user) {
        return reservationRepository.findByUserAndStatusIs(user, ReservationStatus.ACTIVE);
    }


    /**
     * Creates a new reservation for a user and equipment within a specified time window.
     * Throws an exception if the equipment is already reserved during the requested period.
     *
     * @param user      the user creating the reservation
     * @param equipment the equipment to reserve
     * @param start     reservation start time
     * @param end       reservation end time
     * @return the saved reservation
     */
    public Reservation createReservation(User user, Equipment equipment, LocalDateTime start, LocalDateTime end) {
        if (end.isBefore(start) || end.equals(start)) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        enforceWeekendRestrictionForAthletes(user, start, end);

        if (scheduleBlockService.hasActiveBlockConflict(start, end)) {
            throw new IllegalArgumentException("This time slot is blocked by an admin.");
        }

        if (start.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Given start time has already passed!");
        }

        // Check if equipment is already reserved for overlapping time slots
        final List<Reservation> existingReservations = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(equipment, start, end, ReservationStatus.ACTIVE);

        if (!existingReservations.isEmpty()) {
            throw new IllegalArgumentException("Equipment is already reserved for this time slot.");
        }

        if (equipment.getStatus() != EquipmentStatus.AVAILABLE) {
            throw new IllegalArgumentException("Equipment is currently under maintenance");
        }

        List<Reservation> userConflicts = reservationRepository
                .findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(user, start, end, ReservationStatus.ACTIVE);

        if (!userConflicts.isEmpty()) {
            throw new IllegalArgumentException("You already have a reservation during that time.");
        }

        // Create and save the new reservation
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setEquipment(equipment);
        reservation.setStartDatetime(start);
        reservation.setEndDatetime(end);
        reservation.setStatus(ReservationStatus.ACTIVE);

        Reservation saved = reservationRepository.save(reservation);
        logger.info(
                "Reservation created: reservationId={}, userId={}, equipmentId={}, start={}, end={}",
                saved.getId(),
                user.getId(),
                equipment.getId(),
                start,
                end
        );
        return saved;
    }


    /**
     * Cancels an existing reservation by setting its status to CANCELLED.
     * The cancellation is only allowed if the requesting user owns the reservation
     * or if they are an admin/trainer overriding an athlete booking.
     *
     * @param reservationId ID of the reservation to cancel
     * @param actingUser    User requesting the cancellation
     * @return the updated reservation
     */
    @Transactional
    public Reservation cancelReservation(Long reservationId, User actingUser) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));

        boolean isOwner = reservation.getUser().getId().equals(actingUser.getId());
        boolean isAdmin = UserRole.AT.equals(actingUser.getRole()) || UserRole.ADMIN.equals(actingUser.getRole());

        if (!isOwner && !isAdmin) {
            logger.warn(
                    "Reservation cancel denied: reservationId={}, actingUserId={}, ownerUserId={}",
                    reservationId,
                    actingUser.getId(),
                    reservation.getUser().getId()
            );
            throw new AccessDeniedException("Only the reservation owner or an admin can cancel this reservation.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        Reservation saved = reservationRepository.save(reservation);
        logger.info(
                "Reservation cancelled: reservationId={}, actingUserId={}, ownerUserId={}, actedAsAdmin={}",
                reservationId,
                actingUser.getId(),
                reservation.getUser().getId(),
                !isOwner
        );
        if (!isOwner) {
            notifyOwnerOfCancellation(reservation, actingUser);
        }
        return saved;
    }

    private void notifyOwnerOfCancellation(Reservation reservation, User actingUser) {
        if (reservation == null || reservation.getUser() == null) {
            return;
        }

        String equipmentName = reservation.getEquipment() != null && reservation.getEquipment().getName() != null
                ? reservation.getEquipment().getName()
                : "your equipment";
        String formattedStart = reservation.getStartDatetime() != null
                ? reservation.getStartDatetime().format(NOTIFICATION_FORMATTER)
                : "the scheduled time";
        String actorName = formatActingUserName(actingUser);

        String message = String.format(
                "Your reservation for %s on %s was cancelled by %s.",
                equipmentName,
                formattedStart,
                actorName
        );

        notificationService.createNotification(reservation.getUser(), message);
    }

    private String formatActingUserName(User actingUser) {
        if (actingUser == null) {
            return "a trainer";
        }

        String first = actingUser.getFirstName();
        String last = actingUser.getLastName();
        StringBuilder builder = new StringBuilder();

        if (first != null && !first.isBlank()) {
            builder.append(first.trim());
        }
        if (last != null && !last.isBlank()) {
            if (builder.length() > 0) {
                builder.append(" ");
            }
            builder.append(last.trim());
        }

        if (builder.isEmpty()) {
            return "a trainer";
        }

        return builder.toString();
    }

    @Transactional(readOnly = true)
    public List<Reservation> getActiveReservationsForEquipment(Long equipmentId) {
        return reservationRepository.findByEquipmentIdAndEndDatetimeAfterAndStatusIs(
                equipmentId,
                LocalDateTime.now(),
                ReservationStatus.ACTIVE
        );
    }

    /**
     * Returns all reservations currently marked as ACTIVE.
     *
     * @return list of active reservations
     */
    @Transactional(readOnly = true)
    public List<Reservation> getActiveReservations() {
        return reservationRepository.findByStatus(ReservationStatus.ACTIVE);
    }


    /**
     * Updates the start and end times of an existing reservation.
     * Only the owner or an admin can edit a reservation.
     * Throws an exception if the new time slot conflicts with other reservations.
     *
     * @param reservationId ID of the reservation to update
     * @param newStart      new start time
     * @param newEnd        new end time
     * @param actingUser    User requesting the update
     * @return the updated reservation
     */
    @Transactional
    public Reservation updateReservation(Long reservationId, LocalDateTime newStart, LocalDateTime newEnd, User actingUser) {
        LocalDateTime now = LocalDateTime.now();

        if (newEnd.isBefore(newStart) || newEnd.equals(newStart)) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        enforceWeekendRestrictionForAthletes(actingUser, newStart, newEnd);

        if (scheduleBlockService.hasActiveBlockConflict(newStart, newEnd)) {
            throw new IllegalArgumentException("This time slot is blocked by an admin.");
        }

        if (newStart.isBefore(now)) {
            throw new IllegalArgumentException("Given start time has already passed!");
        }

        // Fetch the reservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found"));

        boolean isOwner = reservation.getUser().getId().equals(actingUser.getId());
        boolean isAdmin = UserRole.AT.equals(actingUser.getRole()) || UserRole.ADMIN.equals(actingUser.getRole());

        if (!isOwner && !isAdmin) {
            logger.warn(
                    "Reservation update denied: reservationId={}, actingUserId={}, ownerUserId={}",
                    reservationId,
                    actingUser.getId(),
                    reservation.getUser().getId()
            );
            throw new AccessDeniedException("Only the reservation owner or an admin can edit this reservation.");
        }

        if (reservation.getStartDatetime().isBefore(now)) {
            throw new IllegalArgumentException("Past reservations cannot be edited.");
        }

        if (reservation.getEquipment().getStatus() != EquipmentStatus.AVAILABLE) {
            logger.warn(
                    "Reservation update blocked by equipment status: reservationId={}, equipmentId={}, equipmentStatus={}",
                    reservationId,
                    reservation.getEquipment().getId(),
                    reservation.getEquipment().getStatus()
            );
            cancelReservation(reservationId, actingUser);
            throw new IllegalArgumentException("Equipment is currently under maintenance.");
        }

        // Check for overlapping reservations for the same equipment
        List<Reservation> overlapping = reservationRepository
                .findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                        reservation.getEquipment(), newStart, newEnd, ReservationStatus.ACTIVE);

        // Remove the current reservation from overlapping list if present
        overlapping.removeIf(r -> r.getId().equals(reservationId));

        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("New time slot conflicts with existing reservations.");
        }
        List<Reservation> userConflicts = reservationRepository
                .findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                        actingUser, newStart, newEnd, ReservationStatus.ACTIVE);
        userConflicts.removeIf(r -> r.getId().equals(reservationId));

        if (!userConflicts.isEmpty()) {
            throw new IllegalArgumentException("You already have another reservation during that time.");
        }

        // Update reservation times and save
        reservation.setStartDatetime(newStart);
        reservation.setEndDatetime(newEnd);

        Reservation saved = reservationRepository.save(reservation);
        logger.info(
                "Reservation updated: reservationId={}, actingUserId={}, start={}, end={}",
                reservationId,
                actingUser.getId(),
                newStart,
                newEnd
        );
        return saved;
    }


    /**
     * Retrieves equipment by its ID.
     *
     * @param equipmentId the equipment ID
     * @return the equipment entity
     * @throws IllegalArgumentException if the equipment is not found
     */
    public Equipment getEquipmentById(Long equipmentId) {
        return equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found with id: " + equipmentId));
    }

    private void enforceWeekendRestrictionForAthletes(User user, LocalDateTime start, LocalDateTime end) {
        if (user == null || UserRole.ADMIN.equals(user.getRole()) || UserRole.AT.equals(user.getRole())) {
            return;
        }

        boolean weekendReservationsDisabled = appSettingsRepository.findById(APP_SETTINGS_ID)
                .map(settings -> Boolean.TRUE.equals(settings.getWeekendAutoBlockEnabled()))
                .orElse(false);

        if (!weekendReservationsDisabled) {
            return;
        }

        if (rangeTouchesWeekend(start, end)) {
            throw new IllegalArgumentException("Weekend reservations are disabled.");
        }
    }

    private boolean rangeTouchesWeekend(LocalDateTime start, LocalDateTime end) {
        LocalDate current = start.toLocalDate();
        LocalDate inclusiveEnd = end.minusNanos(1).toLocalDate();

        while (!current.isAfter(inclusiveEnd)) {
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                return true;
            }
            current = current.plusDays(1);
        }

        return false;
    }
}
