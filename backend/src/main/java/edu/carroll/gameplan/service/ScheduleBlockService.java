package edu.carroll.gameplan.service;

import edu.carroll.gameplan.model.AppSettings;
import edu.carroll.gameplan.model.Reservation;
import edu.carroll.gameplan.model.ReservationStatus;
import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.ScheduleBlockStatus;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.repository.AppSettingsRepository;
import edu.carroll.gameplan.repository.ReservationRepository;
import edu.carroll.gameplan.repository.ScheduleBlockRepository;
import edu.carroll.gameplan.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Business logic for creating and enforcing global schedule blocks.
 */
@Service
public class ScheduleBlockService {
    private static final Long APP_SETTINGS_ID = 1L;
    private static final int WEEKEND_SYNC_WINDOW_DAYS = 56;
    private static final String WEEKEND_REASON = "Weekend";
    private static final Set<String> WEEKEND_AUTO_BLOCK_REASONS = Set.of(
            "Weekend",
            "Weekend (auto)",
            "Weekend unavailable (auto)"
    );

    private final ScheduleBlockRepository scheduleBlockRepository;
    private final ReservationRepository reservationRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final UserRepository userRepository;

    public ScheduleBlockService(ScheduleBlockRepository scheduleBlockRepository,
                                ReservationRepository reservationRepository,
                                AppSettingsRepository appSettingsRepository,
                                UserRepository userRepository) {
        this.scheduleBlockRepository = scheduleBlockRepository;
        this.reservationRepository = reservationRepository;
        this.appSettingsRepository = appSettingsRepository;
        this.userRepository = userRepository;
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

    /**
     * Ensures weekend auto blocks exist for the near-future window when enabled in app settings.
     * Existing weekend-day blocks are replaced so each weekend day is fully blocked.
     */
    @Transactional
    public void syncWeekendAutoBlocksIfEnabled(User triggerUser) {
        final AppSettings appSettings = appSettingsRepository.findById(APP_SETTINGS_ID).orElse(null);
        if (appSettings == null || !Boolean.TRUE.equals(appSettings.getWeekendAutoBlockEnabled())) {
            return;
        }

        if (appSettings.getStartTime() == null || appSettings.getEndTime() == null
                || !appSettings.getStartTime().isBefore(appSettings.getEndTime())) {
            return;
        }

        final User createdBy = resolveWeekendBlockCreator(triggerUser);
        if (createdBy == null) {
            return;
        }

        final LocalDate startDate = LocalDate.now();
        final LocalDate endDateExclusive = startDate.plusDays(WEEKEND_SYNC_WINDOW_DAYS);

        for (LocalDate currentDate = startDate; currentDate.isBefore(endDateExclusive); currentDate = currentDate.plusDays(1)) {
            final DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            if (dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY) {
                continue;
            }

            final LocalDateTime blockStart = currentDate.atTime(appSettings.getStartTime());
            final LocalDateTime blockEnd = currentDate.atTime(appSettings.getEndTime());

            final List<ScheduleBlock> overlappingBlocks = scheduleBlockRepository
                    .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                            blockStart,
                            blockEnd,
                            ScheduleBlockStatus.ACTIVE
                    );

            final List<ScheduleBlock> blocksToCancel = overlappingBlocks.stream()
                    .filter(block -> !isTargetWeekendAutoBlock(block, blockStart, blockEnd))
                    .toList();

            if (!blocksToCancel.isEmpty()) {
                blocksToCancel.forEach(block -> block.setStatus(ScheduleBlockStatus.CANCELLED));
                scheduleBlockRepository.saveAll(blocksToCancel);
            }

            final boolean alreadyBlocked = overlappingBlocks.stream()
                    .anyMatch(block -> isTargetWeekendAutoBlock(block, blockStart, blockEnd));

            if (alreadyBlocked) {
                continue;
            }

            final List<Reservation> conflictingReservations = reservationRepository
                    .findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
                            blockStart,
                            blockEnd,
                            ReservationStatus.ACTIVE
                    );

            if (!conflictingReservations.isEmpty()) {
                conflictingReservations.forEach(reservation -> reservation.setStatus(ReservationStatus.CANCELLED));
                reservationRepository.saveAll(conflictingReservations);
            }

            final ScheduleBlock weekendBlock = new ScheduleBlock();
            weekendBlock.setCreatedBy(createdBy);
            weekendBlock.setStartDatetime(blockStart);
            weekendBlock.setEndDatetime(blockEnd);
            weekendBlock.setStatus(ScheduleBlockStatus.ACTIVE);
            weekendBlock.setReason(WEEKEND_REASON);
            scheduleBlockRepository.save(weekendBlock);
        }
    }

    /**
     * Disables existing weekend auto blocks by marking them cancelled.
     */
    @Transactional
    public void removeWeekendAutoBlocks() {
        final List<ScheduleBlock> autoWeekendBlocks = scheduleBlockRepository
                .findByStatusOrderByStartDatetimeAsc(ScheduleBlockStatus.ACTIVE)
                .stream()
                .filter(this::isWeekendAutoBlock)
                .toList();

        if (autoWeekendBlocks.isEmpty()) {
            return;
        }

        autoWeekendBlocks.forEach(block -> block.setStatus(ScheduleBlockStatus.CANCELLED));
        scheduleBlockRepository.saveAll(autoWeekendBlocks);
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

    private User resolveWeekendBlockCreator(User triggerUser) {
        if (triggerUser != null && (UserRole.ADMIN.equals(triggerUser.getRole()) || UserRole.AT.equals(triggerUser.getRole()))) {
            return triggerUser;
        }

        return userRepository.findAll().stream()
                .filter(user -> UserRole.ADMIN.equals(user.getRole()) || UserRole.AT.equals(user.getRole()))
                .findFirst()
                .orElse(null);
    }

    private boolean isWeekendAutoBlock(ScheduleBlock block) {
        if (block == null || block.getReason() == null) {
            return false;
        }

        return WEEKEND_AUTO_BLOCK_REASONS.contains(block.getReason().trim());
    }

    private boolean isTargetWeekendAutoBlock(ScheduleBlock block, LocalDateTime expectedStart, LocalDateTime expectedEnd) {
        return block != null
                && isWeekendAutoBlock(block)
                && expectedStart.equals(block.getStartDatetime())
                && expectedEnd.equals(block.getEndDatetime());
    }
}
