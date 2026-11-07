# Multi-stage build for TrustVault Spring Boot (Java 21)
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper and POM
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Resolve dependencies
RUN ./mvnw dependency:go-offline -B

# Copy source code and package
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S trustvault && adduser -S trustvault -G trustvault
RUN mkdir -p /app/storage && chown -R trustvault:trustvault /app

USER trustvault

COPY --from=builder /workspace/target/*.jar app.jar

ENV PORT=8080
ENV TRUSTVAULT_STORAGE_LOCATION=/app/storage
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
