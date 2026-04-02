package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.ScheduleBlock;
import com.carroll.gameplan.model.ScheduleBlockStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for globally blocked schedule windows.
 */
@Repository
public interface ScheduleBlockRepository extends JpaRepository<ScheduleBlock, Long> {
    List<ScheduleBlock> findByStatusOrderByStartDatetimeAsc(ScheduleBlockStatus status);

    List<ScheduleBlock> findByEndDatetimeAfterAndStartDatetimeBeforeAndStatusIs(
            LocalDateTime end,
            LocalDateTime start,
            ScheduleBlockStatus status
    );
}
