package com.sublex;

import com.sublex.config.DotenvConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SublexBackendApplication {

    public static void main(String[] args) {
        // Load .env file before Spring Boot starts
        DotenvConfig.init();
        SpringApplication.run(SublexBackendApplication.class, args);
    }
}
