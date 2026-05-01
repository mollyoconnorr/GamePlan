package edu.carroll.gameplan.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Logs API request lifecycle events and attaches correlation metadata to MDC.
 * The filter is limited to API and health requests so static frontend routes do
 * not produce noisy request logs.
 */
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_MDC_KEY = "requestId";
    public static final String PRINCIPAL_MDC_KEY = "principal";

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    /**
     * Skips request logging for health checks and static resources that would add noise to logs.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        final String uri = request.getRequestURI();
        return uri == null || (!uri.startsWith("/api") && !"/health".equals(uri));
    }

    /**
     * Adds request correlation data to logs while preserving normal filter-chain execution.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        final String requestId = resolveRequestId(request);
        final String principal = resolvePrincipal();
        final long startedAtNanos = System.nanoTime();
        final String method = request.getMethod();
        final String path = resolvePath(request);

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        if (principal != null) {
            MDC.put(PRINCIPAL_MDC_KEY, principal);
        }
        response.setHeader(REQUEST_ID_HEADER, requestId);

        logger.info(
                "HTTP request started: method={}, path={}, query={}",
                method,
                path,
                request.getQueryString()
        );

        try {
            filterChain.doFilter(request, response);
            final long durationMs = (System.nanoTime() - startedAtNanos) / 1_000_000;
            logger.info(
                    "HTTP request completed: method={}, path={}, status={}, durationMs={}",
                    method,
                    path,
                    response.getStatus(),
                    durationMs
            );
        } catch (Exception ex) {
            final long durationMs = (System.nanoTime() - startedAtNanos) / 1_000_000;
            logger.error(
                    "HTTP request failed: method={}, path={}, durationMs={}, errorType={}, message={}",
                    method,
                    path,
                    durationMs,
                    ex.getClass().getSimpleName(),
                    ex.getMessage(),
                    ex
            );
            throw ex;
        } finally {
            MDC.remove(PRINCIPAL_MDC_KEY);
            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }

    /**
     * Uses an inbound request id when available or creates one for log correlation.
     */
    private String resolveRequestId(HttpServletRequest request) {
        final String incomingRequestId = request.getHeader(REQUEST_ID_HEADER);
        if (StringUtils.hasText(incomingRequestId)) {
            return incomingRequestId.trim();
        }
        return UUID.randomUUID().toString();
    }

    /**
     * Builds the path and query string used in request logs.
     */
    private String resolvePath(HttpServletRequest request) {
        final String uri = request.getRequestURI();
        return StringUtils.hasText(uri) ? uri : "/";
    }

    /**
     * Returns the authenticated principal name for logs without forcing authentication.
     */
    private String resolvePrincipal() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        final String name = authentication.getName();
        if (!StringUtils.hasText(name) || "anonymousUser".equalsIgnoreCase(name)) {
            return null;
        }
        return name;
    }
}
