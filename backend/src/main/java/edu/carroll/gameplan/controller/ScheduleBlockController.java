package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.request.ScheduleBlockRequest;
import edu.carroll.gameplan.dto.response.ScheduleBlockResponse;
import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.ScheduleBlockType;
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

    /**
     * Exposes admin endpoints for creating, updating, listing, and cancelling schedule blocks.
     */
    public ScheduleBlockController(UserService userService,
                                   ScheduleBlockService scheduleBlockService) {
        this.userService = userService;
        this.scheduleBlockService = scheduleBlockService;
    }

    /**
     * Returns the Blocks.
     *
     * @return the current value
     */
    @GetMapping
    public List<ScheduleBlockResponse> getBlocks(OAuth2AuthenticationToken authentication,
                                                 @RequestParam(required = false) Instant from,
                                                 @RequestParam(required = false) Instant to) {
        // Any authenticated user can view blocked windows on their calendar.
        final User currentUser = userService.resolveCurrentUser(authentication);
        scheduleBlockService.syncWeekendAutoBlocksIfEnabled(currentUser);

        final LocalDateTime fromLocal = from != null ? from.atZone(APP_ZONE).toLocalDateTime() : null;
        final LocalDateTime toLocal = to != null ? to.atZone(APP_ZONE).toLocalDateTime() : null;

        return scheduleBlockService.getActiveBlocks(fromLocal, toLocal)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates an admin schedule block from the request payload and returns the cancelled reservation count.
     */
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
                request.getReason(),
                parseBlockType(request.getBlockType())
        );

        return new ScheduleBlockResponse(
                result.block().getId(),
                result.block().getStartDatetime().toString(),
                result.block().getEndDatetime().toString(),
                result.block().getReason(),
                result.block().getBlockType().name(),
                result.canceledReservations()
        );
    }

    /**
     * Updates an existing admin schedule block and returns the cancelled reservation count.
     */
    @PutMapping("/{id}")
    public ScheduleBlockResponse updateBlock(@PathVariable Long id,
                                             OAuth2AuthenticationToken authentication,
                                             @RequestBody ScheduleBlockRequest request) {
        final User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        if (request.getStart() == null || request.getEnd() == null) {
            throw new IllegalArgumentException("Block start and end time are required.");
        }

        ScheduleBlockService.CreateBlockResult result = scheduleBlockService.updateBlock(
                id,
                request.getStart().atZone(APP_ZONE).toLocalDateTime(),
                request.getEnd().atZone(APP_ZONE).toLocalDateTime(),
                request.getReason(),
                parseBlockType(request.getBlockType())
        );

        return new ScheduleBlockResponse(
                result.block().getId(),
                result.block().getStartDatetime().toString(),
                result.block().getEndDatetime().toString(),
                result.block().getReason(),
                result.block().getBlockType().name(),
                result.canceledReservations()
        );
    }

    /**
     * Cancels an admin schedule block by id after the frontend has confirmed the deletion.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteBlock(@PathVariable Long id,
                                              OAuth2AuthenticationToken authentication) {
        final User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        scheduleBlockService.cancelBlock(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Maps a user entity into the admin response shape expected by the frontend.
     */
    private ScheduleBlockResponse toResponse(ScheduleBlock block) {
        return new ScheduleBlockResponse(
                block.getId(),
                block.getStartDatetime().toString(),
                block.getEndDatetime().toString(),
                block.getReason(),
                block.getId() != null && block.getId() < 0 ? "WEEKEND" : resolveBlockType(block).name(),
                null
        );
    }

    /**
     * Resolves block type from request or application context.
     */
    private ScheduleBlockType resolveBlockType(ScheduleBlock block) {
        if (block.getBlockType() != null) {
            return block.getBlockType();
        }

        return ScheduleBlockType.BLOCK;
    }

    /**
     * Parses block type into the frontend model used by the app.
     */
    private ScheduleBlockType parseBlockType(String value) {
        if (value == null || value.isBlank()) {
            return ScheduleBlockType.BLOCK;
        }

        try {
            return ScheduleBlockType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid block type: " + value);
        }
    }
}
