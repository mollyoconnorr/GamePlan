package edu.carroll.gameplan.repository;

import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.ScheduleBlockStatus;
import edu.carroll.gameplan.model.ScheduleBlockType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for globally blocked schedule windows.
 */
@Repository
public interface ScheduleBlockRepository extends JpaRepository<ScheduleBlock, Long> {
    /**
     * Queries findByStatusOrderByStartDatetimeAsc from the backing repository.
     *
     * @return matching records
     */
    List<ScheduleBlock> findByStatusOrderByStartDatetimeAsc(ScheduleBlockStatus status);

    /**
     * Finds schedule blocks that overlap a requested time range.
     *
     * @return overlapping schedule blocks with the requested status
     */
    List<ScheduleBlock> findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
            LocalDateTime end,
            LocalDateTime start,
            ScheduleBlockStatus status
    );

    /**
     * Checks for a block of the given type that fully covers a requested range.
     *
     * @return true when a matching block covers the range
     */
    boolean existsByStartDatetimeLessThanEqualAndEndDatetimeGreaterThanEqualAndStatusIsAndBlockType(
            LocalDateTime start,
            LocalDateTime end,
            ScheduleBlockStatus status,
            ScheduleBlockType blockType
    );
}
