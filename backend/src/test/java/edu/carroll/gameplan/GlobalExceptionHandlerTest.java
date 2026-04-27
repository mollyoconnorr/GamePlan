package edu.carroll.gameplan;

import edu.carroll.gameplan.config.RequestLoggingFilter;
import edu.carroll.gameplan.controller.GlobalExceptionHandler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalExceptionHandlerTest {

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void handleIllegalArgumentReturnsBadRequestWithMessageAndPath() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/equipment");
        request.addHeader(RequestLoggingFilter.REQUEST_ID_HEADER, "hdr-1");

        ResponseEntity<?> response = handler.handleIllegalArgument(
                new IllegalArgumentException("invalid payload"),
                request
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        String body = String.valueOf(response.getBody());
        assertTrue(body.contains("invalid payload"));
        assertTrue(body.contains("/api/equipment"));
        assertTrue(body.contains("hdr-1"));
    }

    @Test
    void handleAccessDeniedReturnsForbidden() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/users");

        ResponseEntity<?> response = handler.handleAccessDenied(
                new AccessDeniedException("forbidden"),
                request
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(String.valueOf(response.getBody()).contains("forbidden"));
    }

    @Test
    void handleResponseStatusExceptionPreservesStatusAndReason() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications/unread-count");

        ResponseEntity<?> response = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your role changed. Please sign in again."),
                request
        );

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        String body = String.valueOf(response.getBody());
        assertTrue(body.contains("Unauthorized"));
        assertTrue(body.contains("Your role changed. Please sign in again."));
    }

    @Test
    void handleUnexpectedPrefersMdcRequestIdWhenPresent() {
        MDC.put(RequestLoggingFilter.REQUEST_ID_MDC_KEY, "mdc-123");
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/blocks/1");
        request.addHeader(RequestLoggingFilter.REQUEST_ID_HEADER, "hdr-ignored");

        ResponseEntity<?> response = handler.handleUnexpected(new RuntimeException(), request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        String body = String.valueOf(response.getBody());
        assertTrue(body.contains("Internal Server Error"));
        assertTrue(body.contains("mdc-123"));
    }
}
