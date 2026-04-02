package com.carroll.gameplan.service;

import com.carroll.gameplan.model.Reservation;
import com.carroll.gameplan.model.ReservationStatus;
import com.carroll.gameplan.model.ScheduleBlock;
import com.carroll.gameplan.model.ScheduleBlockStatus;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.repository.ReservationRepository;
import com.carroll.gameplan.repository.ScheduleBlockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for creating and enforcing global schedule blocks.
 */
@Service
public class ScheduleBlockService {
    private final ScheduleBlockRepository scheduleBlockRepository;
    private final ReservationRepository reservationRepository;

    public ScheduleBlockService(ScheduleBlockRepository scheduleBlockRepository,
                                ReservationRepository reservationRepository) {
        this.scheduleBlockRepository = scheduleBlockRepository;
        this.reservationRepository = reservationRepository;
    }

    /**
     * Lightweight DTO returned after block creation, including cancellation count.
     */
    public record CreateBlockResult(ScheduleBlock block, int canceledReservations) {
    }

    @Transactional(readOnly = true)
    public List<ScheduleBlock> getActiveBlocks(LocalDateTime from, LocalDateTime to) {
        if (from != null && to != null && !from.isBefore(to)) {
            throw new IllegalArgumentException("Block query range is invalid");
        }

        return scheduleBlockRepository.findByStatusOrderByStartDatetimeAsc(ScheduleBlockStatus.ACTIVE)
                .stream()
                .filter(block -> from == null || block.getEndDatetime().isAfter(from))
                .filter(block -> to == null || block.getStartDatetime().isBefore(to))
                .collect(Collectors.toList());
    }

    @Transactional
    public CreateBlockResult createBlock(User createdBy, LocalDateTime start, LocalDateTime end, String reason) {
        validateRange(start, end);

        final List<ScheduleBlock> overlappingBlocks = scheduleBlockRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ScheduleBlockStatus.ACTIVE);

        if (!overlappingBlocks.isEmpty()) {
            throw new IllegalArgumentException("A block already exists for this time slot.");
        }

        final List<Reservation> conflictingReservations = reservationRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ReservationStatus.ACTIVE);

        conflictingReservations.forEach(reservation -> reservation.setStatus(ReservationStatus.CANCELLED));
        reservationRepository.saveAll(conflictingReservations);

        final ScheduleBlock block = new ScheduleBlock();
        block.setCreatedBy(createdBy);
        block.setStartDatetime(start);
        block.setEndDatetime(end);
        block.setStatus(ScheduleBlockStatus.ACTIVE);
        block.setReason(normalizeReason(reason));

        final ScheduleBlock saved = scheduleBlockRepository.save(block);
        return new CreateBlockResult(saved, conflictingReservations.size());
    }

    @Transactional
    public void cancelBlock(Long id) {
        final ScheduleBlock block = scheduleBlockRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Block not found: " + id));

        if (!ScheduleBlockStatus.ACTIVE.equals(block.getStatus())) {
            return;
        }

        block.setStatus(ScheduleBlockStatus.CANCELLED);
        scheduleBlockRepository.save(block);
    }

    @Transactional(readOnly = true)
    public boolean hasActiveBlockConflict(LocalDateTime start, LocalDateTime end) {
        validateRange(start, end);
        return !scheduleBlockRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ScheduleBlockStatus.ACTIVE)
                .isEmpty();
    }

    private void validateRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("Block start and end time are required.");
        }

        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("End time must be after start time.");
        }
    }

    private String normalizeReason(String reason) {
        if (reason == null) {
            return null;
        }

        final String trimmed = reason.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
