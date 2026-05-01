package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.config.RequestLoggingFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

/**
 * Centralized API exception mapping and error logging.
 *
 * <p>This advice keeps controller code focused on business logic while
 * converting common failures into consistent JSON error responses.</p>
 */
@RestControllerAdvice(annotations = RestController.class)
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Converts validation failures into client-readable bad-request responses.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex,
                                                                  HttpServletRequest request) {
        final HttpStatus status = HttpStatus.BAD_REQUEST;
        logHandledException(request, status, ex);
        return buildResponse(status, ex, request);
    }

    /**
     * Converts authorization failures into consistent forbidden responses.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                               HttpServletRequest request) {
        final HttpStatus status = HttpStatus.FORBIDDEN;
        logHandledException(request, status, ex);
        return buildResponse(status, ex, request);
    }

    /**
     * Preserves explicit ResponseStatusException codes while applying the shared error response format.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException ex,
                                                                 HttpServletRequest request) {
        logHandledException(request, ex.getStatusCode(), ex);
        return buildResponse(ex.getStatusCode(), ex, request);
    }

    /**
     * Logs unexpected server errors and returns a generic response to avoid leaking internals.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        final HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        final String requestId = resolveRequestId(request);
        logger.error(
                "Unhandled exception: method={}, path={}, status={}, requestId={}, message={}",
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                requestId,
                ex.getMessage(),
                ex
        );
        return buildResponse(status, ex, request);
    }

    /**
     * Logs handled exceptions with request context at an appropriate severity.
     */
    private void logHandledException(HttpServletRequest request, HttpStatusCode status, Exception ex) {
        logger.warn(
                "Handled request exception: method={}, path={}, status={}, requestId={}, message={}",
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                resolveRequestId(request),
                ex.getMessage()
        );
    }

    /**
     * Builds response from validated input values.
     */
    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status,
                                                           Exception ex,
                                                           HttpServletRequest request) {
        return buildResponse((HttpStatusCode) status, ex, request);
    }

    /**
     * Builds response from validated input values.
     */
    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatusCode status,
                                                           Exception ex,
                                                           HttpServletRequest request) {
        final String requestId = resolveRequestId(request);
        final String error = resolveReasonPhrase(status);
        final String message = resolveErrorMessage(status, ex, error);
        final ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                error,
                message,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(status).body(body);
    }

    /**
     * Chooses a human-readable reason phrase for the supplied HTTP status.
     */
    private String resolveReasonPhrase(HttpStatusCode status) {
        if (status instanceof HttpStatus httpStatus) {
            return httpStatus.getReasonPhrase();
        }

        return "HTTP " + status.value();
    }

    /**
     * Picks the best available message for the API error response body.
     */
    private String resolveErrorMessage(HttpStatusCode status, Exception ex, String fallback) {
        if (ex instanceof ResponseStatusException responseStatusException
                && StringUtils.hasText(responseStatusException.getReason())) {
            return responseStatusException.getReason();
        }

        final String message = ex.getMessage();
        if (StringUtils.hasText(message)) {
            return message;
        }

        return fallback;
    }

    /**
     * Resolves the request identifier from MDC or the incoming request header.
     */
    private String resolveRequestId(HttpServletRequest request) {
        final String mdcRequestId = MDC.get(RequestLoggingFilter.REQUEST_ID_MDC_KEY);
        if (StringUtils.hasText(mdcRequestId)) {
            return mdcRequestId;
        }
        final String headerRequestId = request.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER);
        if (StringUtils.hasText(headerRequestId)) {
            return headerRequestId;
        }
        return "n/a";
    }

    /**
     * Standard API error payload returned by this advice.
     */
    private record ApiErrorResponse(
            Instant timestamp,
            int status,
            String error,
            String message,
            String path,
            String requestId
    ) {
    }
}
