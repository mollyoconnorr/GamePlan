package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.ScheduleBlockStatus;
import edu.carroll.gameplan.model.ScheduleBlockType;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.repository.ReservationRepository;
import edu.carroll.gameplan.repository.ScheduleBlockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.List;
import java.util.ArrayList;
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

        final List<ScheduleBlock> blocks = new ArrayList<>(scheduleBlockRepository.findByStatusOrderByStartDatetimeAsc(ScheduleBlockStatus.ACTIVE)
                .stream()
                .filter(block -> from == null || block.getEndDatetime().isAfter(from))
                .filter(block -> to == null || block.getStartDatetime().isBefore(to))
                .collect(Collectors.toList()));

        if (from != null && to != null) {
            blocks.addAll(buildWeekendBlocks(from, to));
        }

        return blocks.stream()
                .sorted((left, right) -> left.getStartDatetime().compareTo(right.getStartDatetime()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CreateBlockResult createBlock(User createdBy, LocalDateTime start, LocalDateTime end, String reason) {
        return createBlock(createdBy, start, end, reason, ScheduleBlockType.BLOCK);
    }

    @Transactional
    public CreateBlockResult createBlock(User createdBy, LocalDateTime start, LocalDateTime end, String reason, ScheduleBlockType blockType) {
        validateRange(start, end);

        final ScheduleBlockType normalizedType = blockType == null ? ScheduleBlockType.BLOCK : blockType;

        final List<ScheduleBlock> overlappingBlocks = scheduleBlockRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ScheduleBlockStatus.ACTIVE);

        if (!overlappingBlocks.isEmpty()) {
            throw new IllegalArgumentException("A block already exists for this time slot.");
        }

        final List<Reservation> conflictingReservations = normalizedType == ScheduleBlockType.BLOCK
                ? reservationRepository.findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ReservationStatus.ACTIVE)
                : List.of();

        conflictingReservations.forEach(reservation -> reservation.setStatus(ReservationStatus.CANCELLED));
        if (!conflictingReservations.isEmpty()) {
            reservationRepository.saveAll(conflictingReservations);
        }

        final ScheduleBlock block = new ScheduleBlock();
        block.setCreatedBy(createdBy);
        block.setStartDatetime(start);
        block.setEndDatetime(end);
        block.setStatus(ScheduleBlockStatus.ACTIVE);
        block.setBlockType(normalizedType);
        block.setReason(normalizeReason(reason));

        final ScheduleBlock saved = scheduleBlockRepository.save(block);
        return new CreateBlockResult(saved, conflictingReservations.size());
    }

    @Transactional
    public CreateBlockResult updateBlock(Long blockId, LocalDateTime start, LocalDateTime end, String reason, ScheduleBlockType blockType) {
        validateRange(start, end);

        final ScheduleBlock existingBlock = scheduleBlockRepository.findById(blockId)
                .orElseThrow(() -> new IllegalArgumentException("Block not found: " + blockId));

        if (!ScheduleBlockStatus.ACTIVE.equals(existingBlock.getStatus())) {
            throw new IllegalArgumentException("Block is not active: " + blockId);
        }

        final ScheduleBlockType normalizedType = blockType == null ? ScheduleBlockType.BLOCK : blockType;

        final List<ScheduleBlock> overlappingBlocks = scheduleBlockRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ScheduleBlockStatus.ACTIVE)
                .stream()
                .filter(block -> !blockId.equals(block.getId()))
                .collect(Collectors.toList());

        if (!overlappingBlocks.isEmpty()) {
            throw new IllegalArgumentException("A block already exists for this time slot.");
        }

        final List<Reservation> conflictingReservations = normalizedType == ScheduleBlockType.BLOCK
                ? reservationRepository.findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ReservationStatus.ACTIVE)
                : List.of();

        conflictingReservations.forEach(reservation -> reservation.setStatus(ReservationStatus.CANCELLED));
        if (!conflictingReservations.isEmpty()) {
            reservationRepository.saveAll(conflictingReservations);
        }

        existingBlock.setStartDatetime(start);
        existingBlock.setEndDatetime(end);
        existingBlock.setBlockType(normalizedType);
        existingBlock.setReason(normalizeReason(reason));

        final ScheduleBlock saved = scheduleBlockRepository.save(existingBlock);
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
        return scheduleBlockRepository
                .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(start, end, ScheduleBlockStatus.ACTIVE)
                .stream()
                .anyMatch(block -> resolveBlockType(block) != ScheduleBlockType.OPEN);
    }

    /**
     * Returns true when a requested time window overlaps a Saturday or Sunday.
     */
    public boolean hasWeekendConflict(LocalDateTime start, LocalDateTime end) {
        validateRange(start, end);

        LocalDate current = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        while (!current.isAfter(endDate)) {
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                return true;
            }
            current = current.plusDays(1);
        }

        return false;
    }

    /**
     * Returns true when a requested time range is fully covered by an open window.
     */
    public boolean hasOpenWindowCoverage(LocalDateTime start, LocalDateTime end) {
        validateRange(start, end);
        return scheduleBlockRepository.existsByStartDatetimeLessThanEqualAndEndDatetimeGreaterThanEqualAndStatusIsAndBlockType(
                start,
                end,
                ScheduleBlockStatus.ACTIVE,
                ScheduleBlockType.OPEN
        );
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

    private ScheduleBlockType resolveBlockType(ScheduleBlock block) {
        if (block != null && block.getBlockType() != null) {
            return block.getBlockType();
        }

        return ScheduleBlockType.BLOCK;
    }

    private List<ScheduleBlock> buildWeekendBlocks(LocalDateTime from, LocalDateTime to) {
        final List<ScheduleBlock> weekendBlocks = new ArrayList<>();
        LocalDate current = from.toLocalDate();
        LocalDate endDate = to.toLocalDate();

        while (!current.isAfter(endDate)) {
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                weekendBlocks.add(buildWeekendBlock(current));
            }
            current = current.plusDays(1);
        }

        return weekendBlocks;
    }

    private ScheduleBlock buildWeekendBlock(LocalDate date) {
        final ScheduleBlock block = new ScheduleBlock();
        block.setId(-1_000_000_000L - date.toEpochDay());
        block.setStartDatetime(date.atStartOfDay());
        block.setEndDatetime(date.plusDays(1).atStartOfDay());
        block.setStatus(ScheduleBlockStatus.ACTIVE);
        block.setBlockType(ScheduleBlockType.BLOCK);
        block.setReason("Weekend");
        return block;
    }
}
