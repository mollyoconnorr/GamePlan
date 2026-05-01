# GamePlan Backend Developer Guide

This guide documents the GamePlan backend: how it is structured, how it runs, how it is configured, and how to extend it safely.

## Table Of Contents

- [GamePlan Backend Developer Guide](#gameplan-backend-developer-guide)
  - [Table Of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Technology Stack](#technology-stack)
  - [Directory Layout](#directory-layout)
  - [Prerequisites](#prerequisites)
  - [Install And Run](#install-and-run)
    - [Local Database Setup](#local-database-setup)
    - [Run In Development](#run-in-development)
    - [Local Properties](#local-properties)
  - [Running Tests](#running-tests)
  - [Configuration And Profiles](#configuration-and-profiles)
    - [`application-dev.yaml`](#application-devyaml)
    - [`application-prod.yaml`](#application-prodyaml)
    - [`application-example.yaml`](#application-exampleyaml)
    - [Test `application.yaml`](#test-applicationyaml)
    - [Important Notes](#important-notes)
  - [Seeded Users And Data](#seeded-users-and-data)
  - [Okta Configuration](#okta-configuration)
  - [How Okta Works In GamePlan](#how-okta-works-in-gameplan)
  - [Production Packaging](#production-packaging)
  - [Authentication And Security](#authentication-and-security)
  - [Data Model And Business Rules](#data-model-and-business-rules)
    - [Core Entities](#core-entities)
    - [Key Rules](#key-rules)
    - [Time And Zone Handling](#time-and-zone-handling)
  - [Role And Permission Matrix](#role-and-permission-matrix)
  - [API Route Reference](#api-route-reference)
  - [Database Schema](#database-schema)
    - [Core Tables](#core-tables)
    - [Relationships](#relationships)
    - [Entity Notes](#entity-notes)
    - [Practical Constraints](#practical-constraints)
  - [Adding New Backend Features](#adding-new-backend-features)
    - [1. Decide the layer](#1-decide-the-layer)
    - [2. Keep business rules in services](#2-keep-business-rules-in-services)
    - [3. Add DTOs for API boundaries](#3-add-dtos-for-api-boundaries)
    - [4. Update tests alongside code](#4-update-tests-alongside-code)
    - [5. Check the frontend impact](#5-check-the-frontend-impact)
  - [Logging And Observability](#logging-and-observability)
  - [Troubleshooting](#troubleshooting)
    - [Okta login redirects fail](#okta-login-redirects-fail)
    - [A user logs in with the wrong access](#a-user-logs-in-with-the-wrong-access)
    - [Reservations are rejected unexpectedly](#reservations-are-rejected-unexpectedly)
    - [The backend fails to start locally](#the-backend-fails-to-start-locally)
  - [Verification Checklist](#verification-checklist)
  - [Logging In Through Okta](#logging-in-through-okta)

## Overview

The backend is a Spring Boot application in `backend/` that exposes the GamePlan API, handles Okta OIDC authentication, persists application data, enforces role-based access, and serves the built frontend in production.

In local development, the backend runs on port `8080` with the explicit `dev` profile and uses the MySQL datasource from `application-dev.yaml`. In production, the backend is packaged together with the frontend into one Spring Boot JAR.

## Technology Stack

- Java 21
- Spring Boot 4
- Spring Security with OAuth2 / OIDC
- Spring Data JPA
- Spring Web
- H2 for tests
- MySQL for local/dev and production-style deployments
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
        application-dev.yaml
        application-prod.yaml
        application-example.yaml
        logback-spring.xml
        templates/     Server-side HTML templates used by a few routes
    test/
      java/            Unit and integration tests
      resources/
        application.yaml
  build.gradle         Build and packaging configuration
  settings.gradle      Gradle project settings
  gradlew              Gradle wrapper script
```

## Prerequisites

- Java 21
- Node.js and npm if you plan to run `bootJar`, because the backend build also compiles the frontend
- MySQL for local development and production-style profiles
- Access to the appropriate Okta tenant or test identity provider

## Install And Run

### Local Database Setup

The default Spring profile is `prod`. For local development, run the backend with the explicit `dev` profile. The dev profile uses `spring.jpa.hibernate.ddl-auto: create`, so the local schema is recreated each time the dev backend starts.

Create a local MySQL database and user that match `backend/src/main/resources/application-dev.yaml`:

```sql
CREATE DATABASE gameplan_db;
CREATE USER 'gameplan_user'@'localhost' IDENTIFIED BY 'GamePlan123!';
GRANT ALL PRIVILEGES ON gameplan_db.* TO 'gameplan_user'@'localhost';
FLUSH PRIVILEGES;
```

If the user already exists, update its password and grants instead:

```sql
ALTER USER 'gameplan_user'@'localhost' IDENTIFIED BY 'GamePlan123!';
GRANT ALL PRIVILEGES ON gameplan_db.* TO 'gameplan_user'@'localhost';
FLUSH PRIVILEGES;
```

### Run In Development

From `backend/`:

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

The backend uses the active Spring profile and starts on port `8080`.

In normal local development, the backend and frontend run separately:

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

### Local Properties

`bootRun` reads optional values from `backend/local.properties` and passes `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, and `OKTA_ISSUER` into the Java process environment.

Typical use:

- keep local secrets out of git
- store temporary Okta values outside tracked YAML files
- test an alternate Okta app without committing credentials

To make `local.properties` drive local Okta configuration, update the active YAML profile to reference the environment variables, for example `${OKTA_CLIENT_ID}`, `${OKTA_CLIENT_SECRET}`, and `${OKTA_ISSUER}`.

## Running Tests

From `backend/`:

```bash
./gradlew test
```

The backend test profile uses H2 and test-specific OAuth values from `src/test/resources/application.yaml`.

The test suite includes:

- controller tests
- service tests
- integration tests for the main API flows
- security/auth redirect tests
- validation and error handling tests

## Configuration And Profiles

GamePlan uses Spring profiles and YAML files to separate environments. There is no main-resource `application.yaml`; each profile file carries the settings it needs. The application fallback profile is `prod`, and `dev` must be selected explicitly.

`backend/src/main/resources/application-example.yaml` is tracked as a placeholder template. The active main-resource YAML files under `backend/src/main/resources` are ignored local files because they can contain environment-specific values and secrets. Create them locally from the example file or the templates below.

Do not commit real production secrets. Use placeholders in local examples and put deployed secrets in `/etc/gameplan` as described in the IT manual.

### `application-dev.yaml`

Location: `backend/src/main/resources/application-dev.yaml`

This ignored local file contains local development overrides.

Expected shape:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gameplan_db
    username: gameplan_user
    password: GamePlan123!
  jpa:
    hibernate:
      ddl-auto: create
    show-sql: false
  security:
    oauth2:
      client:
        registration:
          okta:
            client-id: Your_dev_okta_client_id
            client-secret: Your_dev_okta_client_secret
            scope:
              - openid
              - profile
              - email
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
            authorization-grant-type: authorization_code
        provider:
          okta:
            issuer-uri: https://your-dev-okta-domain/oauth2/default

app:
  security:
    success-url: "http://localhost:5173/app/home"
    logout-url: "http://localhost:5173/"
    allowed-origins:
      - "https://gameplan.carroll.edu"
      - "http://localhost:5173"
      - "https://localhost:5173"
    base-uri: "/login/oauth2/code/okta"
```

Behavior:

- uses the local MySQL datasource in `application-dev.yaml`
- recreates the schema on startup with `spring.jpa.hibernate.ddl-auto: create`
- localhost success/logout URLs
- localhost CORS origins
- Okta issuer `https://integrator-4407916.okta.com/oauth2/default`
- callback path `/login/oauth2/code/okta`
- logging is controlled by `logback-spring.xml`

### `application-prod.yaml`

Location: `backend/src/main/resources/application-prod.yaml`

This ignored local file contains production-style overrides for local packaging or smoke checks. In a real deployment, `/etc/gameplan/application-prod.yaml` should provide VM-specific values and secrets.

Expected shape:

```yaml
server:
  port: 8080
  address: 127.0.0.1
  forward-headers-strategy: framework

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gameplan_db
    username: gameplan_user
    password: Your_prod_database_password
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  security:
    oauth2:
      client:
        registration:
          okta:
            redirect-uri: "{baseUrl}/authorization-code/callback"
            client-id: Your_prod_okta_client_id
            client-secret: Your_prod_okta_client_secret
            scope:
              - openid
              - profile
              - email
            authorization-grant-type: authorization_code
        provider:
          okta:
            issuer-uri: https://carroll.okta.com

app:
  security:
    success-url: "http://gameplan.carroll.edu/app/home"
    logout-url: "http://gameplan.carroll.edu/"
    allowed-origins:
      - "http://gameplan.carroll.edu"
    base-uri: "/authorization-code/callback"
```

Behavior:

- uses the MySQL datasource in `application-prod.yaml` or `/etc/gameplan/application-prod.yaml`
- schema updates with `spring.jpa.hibernate.ddl-auto: update`
- production Okta issuer and callback paths
- production success/logout URLs
- production CORS origins
- logging is controlled by `logback-spring.xml`

### `application-example.yaml`

Location: `backend/src/main/resources/application-example.yaml`

This tracked file contains placeholder values for dev and production-style profile settings. Copy the relevant values into the ignored local profile files and replace the placeholder secrets.

### Test `application.yaml`

Location: `backend/src/test/resources/application.yaml`

This file contains test-only settings.

Expected shape:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: create-drop
    database-platform: org.hibernate.dialect.H2Dialect
    show-sql: false

  security:
    oauth2:
      client:
        registration:
          okta:
            client-id: test-client-id
            client-secret: test-client-secret
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/authorization-code/callback"
            scope:
              - openid
              - profile
              - email
        provider:
          okta:
            authorization-uri: https://example.test/oauth2/v1/authorize
            token-uri: https://example.test/oauth2/v1/token
            jwk-set-uri: https://example.test/oauth2/v1/keys
            user-info-uri: https://example.test/oauth2/v1/userinfo
            user-name-attribute: sub

app:
  security:
    base-uri: "/authorization-code/callback"
    success-url: "http://localhost:5173/app/home"
    logout-url: "http://localhost:5173/"
    allowed-origins:
      - "https://gameplan.carroll.edu"
      - "http://localhost:5173"
```

Behavior:

- H2 datasource
- stubbed OAuth2 client/provider values
- local success/logout URLs

### Important Notes

- The app’s public URLs and OAuth callback URLs must match the actual deployment origin exactly.
- The backend uses forwarded headers in production so Spring can generate the correct public callback URL behind a reverse proxy.
- CORS is strict on purpose. The frontend origin must be listed in the active profile’s allowed origins.
- `app.security.base-uri` must match the path portion of the Okta redirect callback.

## Seeded Users And Data

`DataSeeder` is active for every non-test profile. That means the baseline seed runs in both local development and production unless the `test` profile is active. The seed methods are written to look up existing rows first, so restarting the app should not duplicate the baseline records.

Baseline data:

- app settings row with week-based calendar display, 15-minute time steps, 30-minute max reservation time, 7 visible days, 8:00 AM to 5:00 PM hours, and weekend auto-blocking disabled
- equipment types for `Wired Boots`, `Wireless Boots`, and `Bath`
- equipment rows for three cold baths, one hot bath, two large wired boots, two small wireless boots, and two medium wireless boots
- admin user `kward@carroll.edu` with role `ADMIN`

The dev profile also seeds example users and calendar data so the app has realistic screens immediately after startup:

- `testuser@carroll.edu` with role `ATHLETE`
- `admin@carroll.edu` with role `ADMIN`
- `trainer@carroll.edu` with role `AT`
- `athlete@carroll.edu` with role `ATHLETE`
- sample reservations for the test user on seeded bath equipment
- sample schedule blocks named `Team lift block`, `Facility event`, and `Coach-only window`

These seeded users have `oidcUserId` set to `NULL`. On first login, `CustomOidcUserService` matches the Okta email to the local user and stores the Okta subject. If Okta sends a different email or alias, GamePlan may create a new pending user instead of using the seeded account.

## Okta Configuration

The dev profile uses the Integrator Free Plan Okta tenant:

- issuer: `https://integrator-4407916.okta.com/oauth2/default`
- redirect URI pattern: `{baseUrl}/login/oauth2/code/{registrationId}`
- app callback path: `/login/oauth2/code/okta`
- local frontend success URL: `http://localhost:5173/app/home`

To point development at a different Okta app, update `backend/src/main/resources/application-dev.yaml` or switch that file to read values from environment variables provided by `backend/local.properties`. Keep the Okta app's allowed sign-in redirect URI aligned with the backend callback URL that Spring generates. For local development, that is normally `http://localhost:8080/login/oauth2/code/okta`.

The prod profile is configured for Carroll Okta:

- issuer: `https://carroll.okta.com`
- redirect URI pattern: `{baseUrl}/authorization-code/callback`
- app callback path: `/authorization-code/callback`

Production deployments should put the real client ID and secret in `/etc/gameplan/application-prod.yaml` as described in the IT manual, not in tracked repository files.

## How Okta Works In GamePlan

Okta handles external identity, but GamePlan keeps the application state locally.

The login flow works like this:

1. The frontend sends the browser to `/oauth2/authorization/okta`.
2. Spring Security redirects the browser to the Okta sign-in page.
3. Okta authenticates the user and sends the browser back to the backend callback URL.
4. `CustomOidcUserService` loads the OIDC profile from Okta.
5. The service links the Okta user to a local `User` row, or creates a new pending one when needed.
6. `VersionedOidcUser` carries the local `authVersion` into the session.
7. `UserService` resolves the authenticated local user from the Okta subject and enforces trainer/admin checks.
8. `SecurityConfig` handles CSRF, CORS, login success, and OIDC logout.
9. `AuthRedirectController` sends login failures back to the frontend with a `loginError` flag.

Key pieces to know:

- `CustomOidcUserService` is responsible for matching or creating the local user record.
- `User.role` is the real authorization source for the app.
- Okta groups can be added as a token claim for testing or reporting, but GamePlan does not automatically map groups into roles.
- `authVersion` changes force the browser to sign in again after a role or approval change.
- `app.security.base-uri` must match the backend callback path that Spring Security expects.

Local development uses:

- Okta issuer: `https://integrator-4407916.okta.com/oauth2/default`
- backend callback: `http://localhost:8080/login/oauth2/code/okta`
- frontend success URL: `http://localhost:5173/app/home`
- frontend logout URL: `http://localhost:5173/`

Production uses:

- Okta issuer: `https://carroll.okta.com`
- backend callback: `/authorization-code/callback`
- frontend success URL: `http://gameplan.carroll.edu/app/home`
- frontend logout URL: `http://gameplan.carroll.edu/`

When you configure a new Okta app, make sure:

- the client ID and secret belong to the same Okta org as the issuer
- the sign-in redirect URI matches the backend callback exactly
- the sign-out redirect URI matches the frontend URL that should load after logout
- the frontend origin is listed in the active profile’s CORS allowed origins

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

- reservation windows must end after they start
- reservations cannot start in the past
- active reservations cannot overlap for the same equipment
- a user cannot hold overlapping active reservations
- athletes cannot reserve weekend time when weekend auto-blocking is enabled
- active hard blocks prevent new reservations and cancel conflicting reservations when created or updated
- open-window blocks mark staffed availability but do not cancel reservations
- the frontend uses app settings `startTime`, `endTime`, `timeStep`, and `maxReservationTime` to build reservation and edit-time choices
- app settings changes cancel active reservations that no longer fit inside the configured daily time window
- maintenance can cancel reservations and notify affected users through in-app notifications
- admin and trainer routes require elevated roles, while admin-only routes call `UserService.requireAdmin`
- `authVersion` changes force re-authentication when roles or approval state change

### Time And Zone Handling

- The application uses `America/Denver` for reservation and block conversions in the main APIs.
- Calendar and reservation UI calculations are aligned to the configured app settings.

## Role And Permission Matrix

| Capability | Student | Athlete | Athletic Trainer | Admin |
| --- | --- | --- | --- | --- |
| Sign in and view profile | Yes | Yes | Yes | Yes |
| Create reservations | No | Yes | Yes | Yes |
| Edit or cancel own reservations | No | Yes | Yes | Yes |
| View schedule blocks | No | Yes | Yes | Yes |
| Manage schedule blocks | No | No | Yes | Yes |
| View all active athlete reservations | No | No | Yes | Yes |
| Manage equipment and equipment types | No | No | Yes | Yes |
| Manage users and roles | No | No | No | Yes |
| Update app settings | No | No | No | Yes |

The backend enforces these permissions in service methods such as `requireTrainer`, `requireAdmin`, and reservation owner checks. Frontend route gating is useful for navigation, but backend authorization is the source of truth.

## API Route Reference

| Route | Methods | Access | Purpose |
| --- | --- | --- | --- |
| `/api/csrf` | `GET` | Public | Creates/exposes the CSRF token cookie for the SPA. |
| `/api/health` | `GET` | Authenticated | Basic application health check. |
| `/api/user` | `GET` | Authenticated | Current user profile, role, and pending status. |
| `/api/reservations` | `GET`, `POST` | Authenticated users; UI exposes creation to approved roles | Current user's reservations and reservation creation. |
| `/api/reservations/{id}` | `PUT`, `DELETE` | Owner, trainer, or admin | Edit or cancel a reservation. |
| `/api/reservations/{equipmentId}` | `GET` | Authenticated | Future active reservations for one equipment item. |
| `/api/reservations/admin` | `GET` | Trainer or admin | All active athlete reservations for staff review. |
| `/api/blocks` | `GET` | Authenticated | Active schedule blocks for the calendar. |
| `/api/blocks` | `POST` | Trainer or admin | Create a block or open window. |
| `/api/blocks/{id}` | `PUT`, `DELETE` | Trainer or admin | Update or cancel a schedule block. |
| `/api/admin/users` | `GET`, `POST` | Admin | List users or create a pending student. |
| `/api/admin/users/{userId}/role` | `POST` | Admin | Change a user's role and increment auth version. |
| `/api/admin/users/pending-count` | `GET` | Admin | Count pending student accounts. |
| `/api/admin/settings` | `GET` | Authenticated | Current calendar and reservation settings. |
| `/api/admin/settings` | `PUT` | Admin | Update global app settings. |
| `/api/equipment` | `GET`, `POST` | Trainer or admin | List or create equipment. |
| `/api/equipment/{id}` | `GET`, `PUT`, `DELETE` | Trainer or admin | View, update, or delete equipment. |
| `/api/equipment/{id}/status` | `PUT` | Trainer or admin | Change equipment status. |
| `/api/equipment-types` | `GET` | Authenticated | List equipment types. |
| `/api/equipment-types` | `POST` | Trainer or admin | Create equipment types. |
| `/api/equipment-types/{id}` | `PUT`, `DELETE` | Trainer or admin | Update or delete equipment types. |
| `/api/equipment-types/{id}/attributes` | `GET` | Authenticated | Read unique stored attributes for a type. |
| `/api/equipment-types/{id}/attributes-all` | `GET` | Authenticated | Read schema-defined attributes for a type. |
| `/api/equipment-types/{typeId}/equipment` | `GET` | Authenticated | Find equipment and reservations by type/attribute. |
| `/api/notifications` | `GET` | Authenticated | Current user's unread in-app notifications. |
| `/api/notifications/unread-count` | `GET` | Authenticated | Current user's unread notification count. |
| `/api/notifications/{id}/read` | `PATCH` | Notification owner | Mark one notification as read. |

## Database Schema

GamePlan’s schema is centered on a small set of relational tables with a few service-managed singleton and JSON-backed fields. If you want the visual version, see the ERD here:

- [GamePlan ERD](../database/gameplan_ERD.png)

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

## Troubleshooting

### Okta login redirects fail

- Confirm the Okta app has the same sign-in redirect URI as the active Spring profile.
- Local dev normally expects `http://localhost:8080/login/oauth2/code/okta`.
- Production normally expects `http://gameplan.carroll.edu/authorization-code/callback`.
- Confirm `issuer-uri`, `client-id`, `client-secret`, `app.security.success-url`, `app.security.logout-url`, `app.security.allowed-origins`, and `app.security.base-uri` all belong to the same environment.

### A user logs in with the wrong access

- Check the local `users` row for role and `pending_approval`.
- Confirm Okta sends the same email address as the seeded or precreated local user.
- If a role changed recently, have the user sign out and back in so the new `authVersion` is loaded.

### Reservations are rejected unexpectedly

- Check for active schedule blocks overlapping the requested time.
- Check equipment status and active reservations for the same equipment.
- Check whether the user already has a reservation in the same time window.
- Check app settings for weekend auto-blocking, configured hours, time step, and maximum reservation time.

### The backend fails to start locally

- Confirm MySQL is running and `gameplan_db` exists.
- Confirm `gameplan_user` has the password from `application-dev.yaml` and privileges on `gameplan_db`.
- Confirm the active profile is the one you expect. The application fallback profile is `prod`; local development should pass `--spring.profiles.active=dev`.

## Verification Checklist

Before merging backend changes, verify the following:

- `./gradlew test` passes
- `./gradlew bootJar` still succeeds
- the backend starts under the expected profile
- the frontend can still log in through Okta
- role-protected routes still behave correctly
- CORS still matches the real browser origin
- CSRF still works for unsafe API calls

## Logging In Through Okta

Use this checklist to verify the real browser flow from end to end.

1. Start the backend with the dev profile from `backend/`.

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

2. Start the frontend from `frontend/`.

```bash
npm run dev
```

3. Open the app in your browser.

```text
http://localhost:5173
```

4. Go to the login page or click the sign-in button.

```text
http://localhost:5173/login
```

5. The frontend redirects the browser to Okta through:

```text
/oauth2/authorization/okta
```

6. Sign in with a test Okta user assigned to the GamePlan app.

7. Okta sends the browser back to the backend callback on port `8080`.

```text
http://localhost:8080/login/oauth2/code/okta
```

8. The backend links the Okta identity to a local `User` record and redirects to the configured success URL.

```text
http://localhost:5173/app/home
```

9. Confirm the header or navbar shows the expected user information.

10. Log out and confirm the browser returns to the frontend logout URL.

```text
http://localhost:5173/
```

If login fails, check:

- the app assignment in Okta
- the client ID and client secret
- the issuer URL
- the redirect URI
- the frontend origin in CORS
- the active Spring profile
