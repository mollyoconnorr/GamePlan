package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Equipment;
import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for managing Reservation entities.
 * <p>
 * Provides CRUD operations via JpaRepository and
 * custom queries for user-specific and equipment-specific reservations.
 * </p>
 */
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    /**
     * Retrieves all reservations for a given user that have the given status.
     *
     * @param user the User whose reservations should be retrieved
     * @param status the ReservationStatus the reservation must have
     * @return a list of Reservation entities for the specified user
     */
    List<Reservation> findByUserAndStatusIs(User user, ReservationStatus status);

    /**
     * Finds reservations for a specific equipment that overlap a given time range.
     * <p>
     * Useful for checking conflicts before creating or updating a reservation.
     * </p>
     *
     * @param equipment the Equipment to check reservations for
     * @param end       the start of the time range (exclusive)
     * @param start     the end of the time range (exclusive)
     * @return a list of overlapping reservations
     */
    List<Reservation> findByEquipmentAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
            Equipment equipment, LocalDateTime end, LocalDateTime start, ReservationStatus status
    );

    List<Reservation> findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
            LocalDateTime end, LocalDateTime start, ReservationStatus status
    );

    List<Reservation> findByUserAndEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
            User user, LocalDateTime end, LocalDateTime start, ReservationStatus status
    );

    /**
     * Retrieves all reservations that match the given status.
     *
     * @param status the reservation status to filter by
     * @return list of reservations with the provided status
     */
    List<Reservation> findByStatus(ReservationStatus status);

    List<Reservation> findByEquipmentIdAndStatusIs(Long equipmentId, ReservationStatus status);
}
