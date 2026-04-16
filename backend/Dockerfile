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

ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar"]
