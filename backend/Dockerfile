FROM gradle:8.10.2-jdk21 AS builder
WORKDIR /workspace
COPY settings.gradle build.gradle gradle.properties ./
COPY src ./src
RUN gradle --no-daemon clean bootJar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S driftguard && adduser -S driftguard -G driftguard
COPY --from=builder /workspace/build/libs/*.jar app.jar
USER driftguard
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
