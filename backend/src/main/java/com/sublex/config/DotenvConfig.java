package com.sublex.config;

import io.github.cdimascio.dotenv.Dotenv;

public class DotenvConfig {

    static {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory("./src/main/resources")
                    .ignoreIfMissing()
                    .load();

            // Set system properties from .env file
            dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

            System.out.println("✅ .env file loaded successfully");
        } catch (Exception e) {
            System.err.println("⚠️  Failed to load .env file: " + e.getMessage());
        }
    }

    // This method ensures the static block runs
    public static void init() {
        // Static block will execute when class is loaded
    }
}
