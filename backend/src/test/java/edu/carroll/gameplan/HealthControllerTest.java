package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.HealthController;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class HealthControllerTest {

    @Test
    void healthReturnsUpPayloadWithTimestamp() {
        HealthController controller = new HealthController();

        Map<String, Object> response = controller.health();

        assertEquals("UP", response.get("status"));
        assertEquals("OK", response.get("message"));
        assertNotNull(response.get("time"));
        Instant.parse(response.get("time").toString());
    }
}
