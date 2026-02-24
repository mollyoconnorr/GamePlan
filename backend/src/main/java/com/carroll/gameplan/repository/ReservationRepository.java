package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByStatus(ReservationStatus status);

    List<Reservation> findByUser_Id(Long userId);

    List<Reservation> findByEquipment_Id(Long equipmentId);

    List<Reservation> findByUser_IdAndStatus(Long userId, ReservationStatus status);
}