package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.model.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;


@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // List all reservations for a specific user
    List<Reservation> findByUser(User user);

    // Find reservations for a specific equipment that overlap a given time range
    List<Reservation> findByEquipmentAndEndDatetimeAfterAndStartDatetimeBefore (
            Equipment equipment, LocalDateTime end, LocalDateTime start
    );

}