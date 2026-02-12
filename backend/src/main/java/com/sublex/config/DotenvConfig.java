package com.sublex.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DotenvConfig {

    @Bean
    public Dotenv dotenv() {
        Dotenv dotenv = Dotenv.configure()
                .directory("./src/main/resources")
                .ignoreIfMissing()
                .load();

        // Load into system properties so Spring can pick them up
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

        return dotenv;
    }
}
