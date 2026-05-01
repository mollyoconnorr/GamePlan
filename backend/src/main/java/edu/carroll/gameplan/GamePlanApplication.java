package edu.carroll.gameplan;

import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point that starts the GamePlan backend service.
 */
@SpringBootApplication
public class GamePlanApplication {

    /**
     * Starts the GamePlan application.
     *
     * @param args command-line arguments
     */
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(GamePlanApplication.class);
        application.setDefaultProperties(Map.of("spring.profiles.default", "prod"));
        application.run(args);
    }
}
