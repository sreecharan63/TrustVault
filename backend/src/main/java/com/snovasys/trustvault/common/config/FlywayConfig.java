package com.snovasys.trustvault.common.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy() {
        return flyway -> {
            try {
                log.info("Running Flyway repair to fix any prior failed migrations or checksum discrepancies...");
                flyway.repair();
                log.info("Flyway repair completed successfully.");
            } catch (Exception e) {
                log.warn("Flyway repair encountered an issue (continuing with migrate): {}", e.getMessage());
            }

            log.info("Running Flyway migrate...");
            flyway.migrate();
            log.info("Flyway migration completed successfully.");
        };
    }
}
