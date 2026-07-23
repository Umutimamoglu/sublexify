# ── Build stage ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src src
RUN mvn clean package -DskipTests -B

# ── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/sublex-backend-1.0.0.jar app.jar

EXPOSE 8080

# Heap follows the container's memory limit instead of a fixed 256m: the
# catalogue endpoints build the whole payload in memory, so a hard cap that
# ignores the instance size is what turns a burst of requests into GC pauses.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
