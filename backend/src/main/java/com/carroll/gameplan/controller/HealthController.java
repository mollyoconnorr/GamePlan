package com.carroll.gameplan.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Exposes a minimal health check for uptime monitoring.
 */
@RestController
@RequestMapping("/api")
public class HealthController {
    private final Logger logger = LoggerFactory.getLogger(HealthController.class);

    /**
     * Health endpoint that returns status and timestamp.
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        logger.info("Health endpoint called");
        return Map.of("status", "UP",
                "time", Instant.now().toString(),
                "message", "OK");
    }
}
