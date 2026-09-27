# Single-image build for free PaaS hosting (Render, Koyeb, …):
# builds the React app, bundles it into Spring Boot as static files, serves both from one URL.

# ---- 1. frontend ----
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. backend (with the frontend baked in) ----
FROM gradle:8.14-jdk21 AS api
WORKDIR /app
COPY backend/settings.gradle backend/build.gradle ./
RUN gradle --no-daemon -q dependencies > /dev/null
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN gradle --no-daemon -q bootJar

# ---- 3. runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 app
COPY --from=api /app/build/libs/app.jar app.jar
USER app
EXPOSE 8080
# Tuned for small free instances (~512 MB RAM)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-XX:+UseSerialGC", "-Xss512k", "-XX:TieredStopAtLevel=1", "-jar", "/app/app.jar"]
