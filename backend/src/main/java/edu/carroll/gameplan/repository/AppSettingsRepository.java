package edu.carroll.gameplan.repository;

import edu.carroll.gameplan.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for persisting and reading the singleton {@link AppSettings} row.
 */
public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
}
