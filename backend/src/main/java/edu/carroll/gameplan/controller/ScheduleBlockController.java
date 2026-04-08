package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.request.ScheduleBlockRequest;
import edu.carroll.gameplan.dto.response.ScheduleBlockResponse;
import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.ScheduleBlockService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Trainer/admin endpoints for managing global schedule blocks.
 */
@RestController
@RequestMapping("/api/blocks")
public class ScheduleBlockController {
    private static final ZoneId APP_ZONE = ZoneId.of("America/Denver");

    private final UserService userService;
    private final ScheduleBlockService scheduleBlockService;

    public ScheduleBlockController(UserService userService,
                                   ScheduleBlockService scheduleBlockService) {
        this.userService = userService;
        this.scheduleBlockService = scheduleBlockService;
    }

    @GetMapping
    public List<ScheduleBlockResponse> getBlocks(OAuth2AuthenticationToken authentication,
                                                 @RequestParam(required = false) Instant from,
                                                 @RequestParam(required = false) Instant to) {
        // Any authenticated user can view blocked windows on their calendar.
        userService.resolveCurrentUser(authentication);

        final LocalDateTime fromLocal = from != null ? from.atZone(APP_ZONE).toLocalDateTime() : null;
        final LocalDateTime toLocal = to != null ? to.atZone(APP_ZONE).toLocalDateTime() : null;

        return scheduleBlockService.getActiveBlocks(fromLocal, toLocal)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public ScheduleBlockResponse createBlock(OAuth2AuthenticationToken authentication,
                                             @RequestBody ScheduleBlockRequest request) {
        final User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        if (request.getStart() == null || request.getEnd() == null) {
            throw new IllegalArgumentException("Block start and end time are required.");
        }

        ScheduleBlockService.CreateBlockResult result = scheduleBlockService.createBlock(
                user,
                request.getStart().atZone(APP_ZONE).toLocalDateTime(),
                request.getEnd().atZone(APP_ZONE).toLocalDateTime(),
                request.getReason()
        );

        return new ScheduleBlockResponse(
                result.block().getId(),
                result.block().getStartDatetime().toString(),
                result.block().getEndDatetime().toString(),
                result.block().getReason(),
                result.canceledReservations()
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteBlock(@PathVariable Long id,
                                              OAuth2AuthenticationToken authentication) {
        final User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        scheduleBlockService.cancelBlock(id);
        return ResponseEntity.noContent().build();
    }

    private ScheduleBlockResponse toResponse(ScheduleBlock block) {
        return new ScheduleBlockResponse(
                block.getId(),
                block.getStartDatetime().toString(),
                block.getEndDatetime().toString(),
                block.getReason(),
                null
        );
    }
}
