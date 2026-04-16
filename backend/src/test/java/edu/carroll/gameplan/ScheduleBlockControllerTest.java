package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.ScheduleBlockController;
import edu.carroll.gameplan.dto.request.ScheduleBlockRequest;
import edu.carroll.gameplan.dto.response.ScheduleBlockResponse;
import edu.carroll.gameplan.model.ScheduleBlock;
import edu.carroll.gameplan.model.ScheduleBlockType;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.ScheduleBlockService;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScheduleBlockControllerTest {

    private static final ZoneId APP_ZONE = ZoneId.of("America/Denver");

    private UserService userService;
    private ScheduleBlockService scheduleBlockService;
    private ScheduleBlockController controller;
    private OAuth2AuthenticationToken authentication;
    private User trainer;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        scheduleBlockService = mock(ScheduleBlockService.class);
        controller = new ScheduleBlockController(userService, scheduleBlockService);
        authentication = mock(OAuth2AuthenticationToken.class);

        trainer = new User();
        trainer.setId(7L);
        trainer.setRole(UserRole.AT);
        when(userService.resolveCurrentUser(authentication)).thenReturn(trainer);
    }

    @Test
    void getBlocksSyncsWeekendBlocksAndMapsResponseTypes() {
        ScheduleBlock weekendBlock = new ScheduleBlock();
        weekendBlock.setId(-1L);
        weekendBlock.setStartDatetime(LocalDateTime.of(2026, 4, 18, 8, 0));
        weekendBlock.setEndDatetime(LocalDateTime.of(2026, 4, 18, 17, 0));
        weekendBlock.setReason("Weekend");

        ScheduleBlock regularBlockWithNullType = new ScheduleBlock();
        regularBlockWithNullType.setId(10L);
        regularBlockWithNullType.setStartDatetime(LocalDateTime.of(2026, 4, 21, 10, 0));
        regularBlockWithNullType.setEndDatetime(LocalDateTime.of(2026, 4, 21, 11, 0));
        regularBlockWithNullType.setReason("Maintenance");
        regularBlockWithNullType.setBlockType(null);

        when(scheduleBlockService.getActiveBlocks(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of(weekendBlock, regularBlockWithNullType));

        Instant from = Instant.parse("2026-04-18T14:00:00Z");
        Instant to = Instant.parse("2026-04-22T04:00:00Z");
        List<ScheduleBlockResponse> response = controller.getBlocks(authentication, from, to);

        assertEquals(2, response.size());
        assertEquals("WEEKEND", response.get(0).blockType());
        assertEquals("BLOCK", response.get(1).blockType());

        verify(userService).resolveCurrentUser(authentication);
        verify(scheduleBlockService).syncWeekendAutoBlocksIfEnabled(trainer);
        ArgumentCaptor<LocalDateTime> fromCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> toCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(scheduleBlockService).getActiveBlocks(fromCaptor.capture(), toCaptor.capture());
        assertEquals(from.atZone(APP_ZONE).toLocalDateTime(), fromCaptor.getValue());
        assertEquals(to.atZone(APP_ZONE).toLocalDateTime(), toCaptor.getValue());
    }

    @Test
    void createBlockRejectsMissingStartOrEnd() {
        ScheduleBlockRequest request = new ScheduleBlockRequest();
        request.setEnd(Instant.now().plusSeconds(3600));

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> controller.createBlock(authentication, request)
        );

        assertEquals("Block start and end time are required.", error.getMessage());
    }

    @Test
    void createBlockParsesBlockTypeAndReturnsCancellationCount() {
        ScheduleBlockRequest request = new ScheduleBlockRequest();
        request.setStart(Instant.parse("2026-04-23T15:00:00Z"));
        request.setEnd(Instant.parse("2026-04-23T16:00:00Z"));
        request.setReason("Open gym");
        request.setBlockType("open");

        ScheduleBlock saved = new ScheduleBlock();
        saved.setId(101L);
        saved.setStartDatetime(request.getStart().atZone(APP_ZONE).toLocalDateTime());
        saved.setEndDatetime(request.getEnd().atZone(APP_ZONE).toLocalDateTime());
        saved.setReason("Open gym");
        saved.setBlockType(ScheduleBlockType.OPEN);
        when(scheduleBlockService.createBlock(
                trainer,
                request.getStart().atZone(APP_ZONE).toLocalDateTime(),
                request.getEnd().atZone(APP_ZONE).toLocalDateTime(),
                "Open gym",
                ScheduleBlockType.OPEN
        )).thenReturn(new ScheduleBlockService.CreateBlockResult(saved, 0));

        ScheduleBlockResponse response = controller.createBlock(authentication, request);

        assertEquals(101L, response.id());
        assertEquals("OPEN", response.blockType());
        assertEquals(0, response.canceledReservations());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
    }

    @Test
    void createBlockRejectsInvalidBlockType() {
        ScheduleBlockRequest request = new ScheduleBlockRequest();
        request.setStart(Instant.parse("2026-04-23T15:00:00Z"));
        request.setEnd(Instant.parse("2026-04-23T16:00:00Z"));
        request.setBlockType("unknown");

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> controller.createBlock(authentication, request)
        );

        assertEquals("Invalid block type: unknown", error.getMessage());
    }

    @Test
    void updateBlockUsesDefaultBlockTypeWhenMissing() {
        ScheduleBlockRequest request = new ScheduleBlockRequest();
        request.setStart(Instant.parse("2026-04-24T15:00:00Z"));
        request.setEnd(Instant.parse("2026-04-24T16:00:00Z"));
        request.setReason("Lift");
        request.setBlockType(null);

        LocalDateTime expectedStart = request.getStart().atZone(APP_ZONE).toLocalDateTime();
        LocalDateTime expectedEnd = request.getEnd().atZone(APP_ZONE).toLocalDateTime();
        ScheduleBlock saved = new ScheduleBlock();
        saved.setId(15L);
        saved.setStartDatetime(expectedStart);
        saved.setEndDatetime(expectedEnd);
        saved.setReason("Lift");
        saved.setBlockType(ScheduleBlockType.BLOCK);

        when(scheduleBlockService.updateBlock(15L, expectedStart, expectedEnd, "Lift", ScheduleBlockType.BLOCK))
                .thenReturn(new ScheduleBlockService.CreateBlockResult(saved, 2));

        ScheduleBlockResponse response = controller.updateBlock(15L, authentication, request);

        assertEquals(15L, response.id());
        assertEquals("BLOCK", response.blockType());
        assertEquals(2, response.canceledReservations());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(scheduleBlockService).updateBlock(15L, expectedStart, expectedEnd, "Lift", ScheduleBlockType.BLOCK);
    }

    @Test
    void deleteBlockReturnsNoContent() {
        ResponseEntity<Object> response = controller.deleteBlock(22L, authentication);

        assertEquals(HttpStatusCode.valueOf(204), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(scheduleBlockService).cancelBlock(22L);
    }
}
