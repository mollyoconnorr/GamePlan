# GamePlan Backend Developer Guide

This guide documents the GamePlan backend: how it is structured, how it runs, how it is configured, and how to extend it safely.

## Table Of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Directory Layout](#directory-layout)
- [Prerequisites](#prerequisites)
- [Install And Run](#install-and-run)
- [Running Tests](#running-tests)
- [Configuration And Profiles](#configuration-and-profiles)
- [Production Packaging](#production-packaging)
- [Authentication And Security](#authentication-and-security)
- [Data Model And Business Rules](#data-model-and-business-rules)
- [Database Schema](#database-schema)
- [Adding New Backend Features](#adding-new-backend-features)
- [Logging And Observability](#logging-and-observability)
- [Verification Checklist](#verification-checklist)

## Overview

The backend is a Spring Boot application in `backend/` that exposes the GamePlan API, handles Okta OIDC authentication, persists application data, enforces role-based access, and serves the built frontend in production.

In local development, the backend runs on port `8080` and typically uses the H2 in-memory database. In production, the backend is packaged together with the frontend into one Spring Boot JAR.

## Technology Stack

- Java 21
- Spring Boot 4
- Spring Security with OAuth2 / OIDC
- Spring Data JPA
- Spring Web
- Spring Mail
- H2 for local/dev and tests
- MySQL for production-style deployments
- Gradle with the Spring Boot and dependency-management plugins

## Directory Layout

```text
backend/
  src/
    main/
      java/edu/carroll/gameplan/
        config/        Security, logging, seed data, and other app configuration
        controller/    REST controllers and error handling
        dto/           Request and response data transfer objects
        model/         JPA entities and enums
        repository/    Spring Data repository interfaces
        service/       Business logic for users, reservations, blocks, equipment, and settings
      resources/
        application.yaml
        application-dev.yaml
        application-prod.yaml
        logback-spring.xml
        templates/     Server-side HTML templates used by a few routes
    test/
      java/            Unit and integration tests
      resources/
        application-test.yaml
  build.gradle         Build and packaging configuration
  settings.gradle      Gradle project settings
  gradlew              Gradle wrapper script
```

## Prerequisites

- Java 21
- Node.js and npm if you plan to run `bootJar`, because the backend build also compiles the frontend
- Access to the appropriate Okta tenant or test identity provider
- A database choice if you are running outside the dev profile

## Install And Run

### Run In Development

From `backend/`:

```bash
./gradlew bootRun
```

The backend uses the active Spring profile and starts on port `8080`.

In normal local development, the backend and frontend run separately:

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

### Local Properties

`bootRun` reads optional values from `backend/local.properties` and passes through selected environment variables for OAuth and mail settings.

Typical use:

- keep local secrets out of git
- store temporary Okta values in `local.properties`
- override mail settings with environment variables when needed

## Running Tests

From `backend/`:

```bash
./gradlew test
```

The backend test profile uses H2 and test-specific OAuth values from `src/test/resources/application-test.yaml`.

The test suite includes:

- controller tests
- service tests
- integration tests for the main API flows
- security/auth redirect tests
- validation and error handling tests

## Configuration And Profiles

GamePlan uses Spring profiles and YAML files to separate environments.

### `application.yaml`

Shared defaults and base security/OIDC settings.

### `application-dev.yaml`

Local development settings:

- H2 in-memory database
- verbose logging
- localhost success/logout URLs
- localhost CORS origins

### `application-prod.yaml`

Production-style settings:

- MySQL datasource
- production Okta issuer and callback paths
- production success/logout URLs
- production CORS origins

### `application-test.yaml`

Test-only settings:

- H2 datasource
- stubbed OAuth2 client/provider values
- local success/logout URLs

### Important Notes

- The app’s public URLs and OAuth callback URLs must match the actual deployment origin exactly.
- The backend uses forwarded headers in production so Spring can generate the correct public callback URL behind a reverse proxy.
- CORS is strict on purpose. The frontend origin must be listed in the active profile’s allowed origins.

## Production Packaging

The production artifact is built from `backend/` with:

```bash
./gradlew bootJar
```

That task:

- installs frontend dependencies
- builds the frontend
- copies `frontend/dist` into the Spring Boot JAR

The resulting JAR serves:

- the backend API
- the built frontend assets
- the small server-side routes needed for login/logout and SPA forwarding

## Authentication And Security

GamePlan uses Okta OIDC and local user records together:

- Okta handles the external identity login
- `CustomOidcUserService` links or provisions a local `User`
- `UserService` resolves the current authenticated user from the OIDC subject
- role checks happen against the local `User.role`

Security behavior to know:

- CSRF protection is enabled for unsafe requests
- `/api/csrf` exposes the token so the SPA can bootstrap `X-XSRF-TOKEN`
- `/api/logout` uses OIDC logout support
- session versioning is used to invalidate stale roles after changes

## Data Model And Business Rules

### Core Entities

- `User`
- `Reservation`
- `Equipment`
- `EquipmentType`
- `EquipmentAttribute`
- `ScheduleBlock`
- `AppSettings`
- `Notification`

### Key Rules

- reservation windows cannot overlap for the same equipment
- users cannot reserve outside configured time bounds
- weekend blocks and open windows alter the available calendar windows
- maintenance can cancel reservations and notify affected users
- admin and trainer routes require elevated roles
- `authVersion` changes force re-authentication when roles or approval state change

### Time And Zone Handling

- The application uses `America/Denver` for reservation and block conversions in the main APIs.
- Calendar and reservation UI calculations are aligned to the configured app settings.

## Database Schema

GamePlan’s schema is centered on a small set of relational tables with a few service-managed singleton and JSON-backed fields. If you want the visual version, see the ERD here:

- [GamePlan ERD](../database/gameplan-erd.png)

### Core Tables

- `User`
- `Reservation`
- `Equipment`
- `EquipmentType`
- `EquipmentAttribute`
- `ScheduleBlock`
- `AppSettings`
- `Notification`

### Relationships

- A `User` can own many `Reservation` rows.
- A `User` can receive many `Notification` rows.
- A `User` can create many `ScheduleBlock` rows.
- An `EquipmentType` can have many `Equipment` rows.
- An `Equipment` belongs to exactly one `EquipmentType`.
- An `Equipment` can have many `Reservation` rows.
- An `Equipment` can have many `EquipmentAttribute` rows.
- A `Reservation` belongs to exactly one `User` and one `Equipment`.
- A `ScheduleBlock` belongs to exactly one creator `User`.

### Entity Notes

- `User` stores the local app identity, role, email, names, approval state, and `authVersion`.
- `Reservation` stores the active or cancelled booking window for a piece of equipment.
- `EquipmentType` stores the category name, UI color, and JSON field schema for dynamic attributes.
- `Equipment` stores the individual item, its current status, and its attributes.
- `EquipmentAttribute` stores name/value pairs attached to a specific equipment item.
- `ScheduleBlock` stores blocked or open windows, their reason, status, and creator.
- `AppSettings` stores the singleton calendar/reservation configuration row.
- `Notification` stores unread/read in-app messages for impacted users.

### Practical Constraints

- Primary keys are generated with database identity columns, except `AppSettings`, which uses a fixed singleton id of `1`.
- `EquipmentType.name` must be unique.
- `Equipment.name` and the main schedule fields are required.
- `Reservation`, `ScheduleBlock`, and `Notification` all track timestamps for auditing and UI display.
- `EquipmentType.fieldSchema` is stored as JSON and drives the dynamic attribute UI.
- Deleting equipment or blocks can cascade into reservation cleanup, depending on the service workflow.
- Weekend blocks and open windows are represented as `ScheduleBlock` rows, not as a separate table.

## Adding New Backend Features

### 1. Decide the layer

Use the usual Spring layering:

- controller for HTTP input/output
- service for business logic
- repository for database access
- dto for request/response shapes
- model for persisted entities

### 2. Keep business rules in services

Controllers should stay thin. Put validation, role rules, and workflow logic in services.

### 3. Add DTOs for API boundaries

Do not expose entities directly when the frontend should only see a subset of fields.

### 4. Update tests alongside code

Add or update unit/integration tests for:

- happy paths
- authorization checks
- validation failures
- conflict cases

### 5. Check the frontend impact

If an API changes:

- update the matching frontend API wrapper
- update shared types if needed
- update the relevant page/component

## Logging And Observability

The backend logs:

- request completion through `RequestLoggingFilter`
- startup and runtime errors through standard Spring logging
- structured details for auth, reservation, block, and equipment workflows

In production, log output is configured through `logback-spring.xml` and can be written to a file directory configured by `gameplan.logging.dir`.

Helpful places to inspect during debugging:

- `backend/src/main/resources/logback-spring.xml`
- `backend/src/main/java/edu/carroll/gameplan/config/RequestLoggingFilter.java`
- `backend/src/main/java/edu/carroll/gameplan/controller/GlobalExceptionHandler.java`

## Verification Checklist

Before merging backend changes, verify the following:

- `./gradlew test` passes
- `./gradlew bootJar` still succeeds
- the backend starts under the expected profile
- the frontend can still log in through Okta
- role-protected routes still behave correctly
- CORS still matches the real browser origin
- CSRF still works for unsafe API calls
