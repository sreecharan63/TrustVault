# Multi-stage build for TrustVault Spring Boot (Java 21)
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper and POM from backend
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw

# Resolve dependencies offline
RUN ./mvnw dependency:go-offline -B

# Copy backend source code and build production JAR
COPY backend/src/ src/
RUN ./mvnw clean package -DskipTests -B

# Minimal, secure JRE 21 runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for enterprise container security
RUN addgroup -S trustvault && adduser -S trustvault -G trustvault
RUN mkdir -p /app/storage && chown -R trustvault:trustvault /app

USER trustvault

COPY --from=builder /workspace/target/*.jar app.jar

ENV PORT=8080
ENV TRUSTVAULT_STORAGE_LOCATION=/app/storage
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
