---
output:
  word_document: default
  html_document: default
---
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
- [Seeded Users And Data](#seeded-users-and-data)
- [Okta Configuration](#okta-configuration)
- [Production Packaging](#production-packaging)
- [Authentication And Security](#authentication-and-security)
- [Okta Setup For Development](#okta-setup-for-development)
- [Data Model And Business Rules](#data-model-and-business-rules)
- [Database Schema](#database-schema)
- [Adding New Backend Features](#adding-new-backend-features)
- [Logging And Observability](#logging-and-observability)
- [Troubleshooting](#troubleshooting)
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

### Pinned Versions

These are the versions explicitly pinned in this repository:

- Java 21
- Spring Boot `4.0.2`
- Spring Dependency Management `1.1.7`
- React `19.2.0`
- React DOM `19.2.0`
- React Router DOM `7.13.0`
- Vite `7.2.4`
- TypeScript `5.9.3`
- Tailwind CSS `4.1.18`
- Day.js `1.11.19`
- Lucide React `0.563.0`

Backend dependencies managed by Spring Boot include Spring Security, Spring Web, Spring Data JPA, Spring Mail, H2, and the MySQL connector, but those versions are resolved by the Spring Boot dependency set rather than pinned directly in the build file.

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

## Okta Setup For Development

This section walks through the full Okta setup for GamePlan local development and testing.

Important note:

- In Okta, the value that many people call the "client key" is the `client-id`.
- The `client-secret` must stay private. Do not commit a real secret to git.
- GamePlan uses Okta for authentication, but the application role is stored locally in GamePlan as `User.role`.
- If you want Okta to carry role-like membership data into the token, use Okta groups and a `groups` claim.

### 1. Create a free Okta developer org

1. Go to the Okta developer signup page at [developer.okta.com](https://developer.okta.com/).
2. Choose the Integrator Free Plan option.
3. Enter your first name, last name, work email, and country or region.
4. Open the verification email from Okta.
5. Activate your account and finish setting up your password and other authenticator options.
6. Sign in to the Admin Console for your new org.
7. Copy your Okta domain. It usually looks like `your-name.okta.com` or `integrator-123456.okta.com`.

Use that domain whenever the manual refers to `{yourOktaDomain}`.

### 2. Create the Okta app integration

GamePlan uses a web application integration with the OpenID Connect redirect flow.

1. In the Okta Admin Console, go to `Applications` > `Applications`.
2. Click `Create App Integration`.
3. Select `OIDC - OpenID Connect` as the sign-in method.
4. Select `Web Application` as the application type.
5. Enter a name for the app, such as `GamePlan`.
6. Configure the redirect URLs.
7. Save the integration.

For local development in this repository, the callback URL used by Spring Security is:

```text
http://localhost:8080/login/oauth2/code/okta
```

That value comes from `spring.security.oauth2.client.registration.okta.redirect-uri` in `backend/src/main/resources/application-dev.yaml` and the `app.security.base-uri` setting in the same file. The Okta callback is the backend on port `8080`, not the frontend dev server.

For production-style deployments, the callback path used by this repository is:

```text
/authorization-code/callback
```

So the full public redirect URI should be the deployed backend origin plus that path. For example, if the app is published at `https://gameplan.carroll.edu`, the redirect URI becomes:

```text
https://gameplan.carroll.edu/authorization-code/callback
```

If you are unsure which value to use, check these files:

- `backend/src/main/resources/application-dev.yaml`
- `backend/src/main/resources/application-prod.yaml`
- `backend/src/main/java/edu/carroll/gameplan/config/SecurityConfig.java`

### 3. Find the client ID and client secret

After saving the app integration:

1. Open the app integration in the Admin Console.
2. Go to the `General` tab.
3. Look in the `Client Credentials` section.
4. Copy the `Client ID`.
5. Copy the `Client Secret`.

These are the values GamePlan needs to talk to Okta.

### 4. Add the Okta values to GamePlan

This repository is already wired to read Okta values from configuration files and environment variables.

For local development, the recommended approach is:

1. Put your local Okta values in `backend/local.properties`.
2. Run the backend with `./gradlew bootRun`.
3. Let Gradle pass the values through to the application at runtime.

The Gradle build already reads these keys from `backend/local.properties`:

```text
OKTA_CLIENT_ID
OKTA_CLIENT_SECRET
OKTA_ISSUER
```

A typical local properties file looks like this:

```properties
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_ISSUER=https://your-okta-domain/oauth2/default
```

Notes:

- `OKTA_ISSUER` should match the issuer shown by your Okta org.
- The app’s development profile uses the issuer URI from `backend/src/main/resources/application-dev.yaml`.
- Never commit real secrets to the repository.

### 5. Create app roles with Okta groups

GamePlan’s actual authorization roles live in the application database as `User.role`, but Okta groups are still useful for testing and for carrying identity hints in the token.

If you want to model roles in Okta:

1. In the Admin Console, go to `Directory` > `Groups`.
2. Click `Add group`.
3. Create groups that match the access levels you want to test, such as:
   - `GamePlan-Admin`
   - `GamePlan-AT`
   - `GamePlan-Athlete`
4. Save each group.
5. Open each group and assign test users to it.

If you want those groups to appear in the ID token:

1. Go back to `Applications` > `Applications`.
2. Open the GamePlan OIDC app.
3. Go to the `Sign On` tab.
4. Edit the ID token settings.
5. Add a `groups` claim.
6. Use a group filter that returns the groups you want, for example a regex that matches the GamePlan groups.
7. Save the claim configuration.

GamePlan currently does not automatically convert Okta groups into `User.role`. Instead, the backend provisions or links the local user record in `CustomOidcUserService`, and the admin screens or seed data set the application role.

### 6. Understand the redirect and sign-out URIs

There are two separate URL concepts to keep straight:

- Sign-in redirect URI: where Okta sends the browser after login
- Sign-out redirect URI: where the browser goes after logout

For this repository:

- Local sign-in redirect URI: `http://localhost:8080/login/oauth2/code/okta`
- Local sign-out redirect URI: `http://localhost:5173/`
- Production sign-in redirect URI: public backend origin plus `/authorization-code/callback`
- Production sign-out redirect URI: public frontend origin

How to figure them out:

1. Open `backend/src/main/resources/application-dev.yaml` for local development values.
2. Open `backend/src/main/resources/application-prod.yaml` for production values.
3. Check `backend/src/main/java/edu/carroll/gameplan/config/SecurityConfig.java` to see the callback path that Spring Security actually expects.
4. Match the Okta app’s redirect URLs to the exact scheme, host, port, and path that your app uses.

Rules of thumb:

- The backend callback must match exactly.
- The frontend logout target should match the browser URL users should land on after sign-out.
- If the backend is behind a reverse proxy in production, use the public URL, not the internal one.

### 7. Test the login flow

1. Start the backend with the dev profile.
2. Start the frontend.
3. Open the app in a browser.
4. Click the sign-in button or visit a protected route.
5. Confirm that the browser redirects to Okta.
6. Sign in with a test user that exists in your Okta org.
7. Confirm that Okta redirects back to GamePlan and that the local user record is created or linked.
8. Verify that the user lands on the configured success URL.
9. Log out and confirm that the browser returns to the configured logout URL.

If login fails, check these first:

- The client ID and client secret values
- The issuer URL
- The exact redirect URI
- The allowed frontend origin in CORS
- Whether the test user is assigned to the app integration

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

Use this checklist when you want to verify the real login flow from the browser.

1. Start the backend from `backend/` with the dev profile.

```bash
./gradlew bootRun
```

2. Start the frontend from `frontend/`.

```bash
npm run dev
```

3. Open the frontend in your browser at:

```text
http://localhost:5173
```

4. Click the app’s sign-in button, or go directly to the frontend login route:

```text
http://localhost:5173/login
```

5. The frontend login page will redirect the browser to Okta by sending it to:

```text
/oauth2/authorization/okta
```

6. Sign in with the test user you created in your Okta developer org.

7. After Okta authenticates the user, it sends the browser back to the backend callback on port `8080`.

For this repository, the local callback is:

```text
http://localhost:8080/login/oauth2/code/okta
```

8. The backend links the Okta identity to a local `User` record, then redirects the browser to the configured success URL.

For local development, that landing page is:

```text
http://localhost:5173/app/home
```

9. Confirm that you are signed in and can see the authenticated app shell, including your username and navigation.

10. Open a protected route, such as reservations or admin pages, to confirm the session is working.

11. Log out using the app’s logout control.

12. Confirm that logout returns you to the configured frontend logout page:

```text
http://localhost:5173/
```

If login does not work, check these first:

- the Okta app is assigned to the test user
- the client ID and client secret are correct
- the issuer URL matches the Okta org
- the redirect URI matches the backend callback exactly
- the frontend and backend are both running
