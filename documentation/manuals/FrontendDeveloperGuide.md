---
output:
  word_document: default
  pdf_document: default
  html_document: default
---
# Frontend Developer Guide

This guide documents the GamePlan frontend: how it is structured, what technology it uses, how to run it in different modes, and how to maintain it safely.

## Table Of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Directory Layout](#directory-layout)
- [Prerequisites](#prerequisites)
- [Install Dependencies](#install-dependencies)
- [Running In Development Mode](#running-in-development-mode)
- [Running Tests](#running-tests)
- [Linting](#linting)
- [Building For Production](#building-for-production)
- [Previewing A Production Build](#previewing-a-production-build)
- [Backend-Integrated Build](#backend-integrated-build)
- [Application Routing](#application-routing)
- [Auth And API Access](#auth-and-api-access)
- [Data Flow Conventions](#data-flow-conventions)
- [Adding New Frontend Features](#adding-new-frontend-features)
- [Security](#security)
- [Keeping The Frontend Up To Date](#keeping-the-frontend-up-to-date)
- [Verification Checklist](#verification-checklist)

## Overview

The frontend is a React single-page application in `frontend/`. It is developed with Vite and TypeScript, and it talks to the Spring Boot backend through same-origin API paths such as `/api/user`, `/api/reservations`, and `/oauth2/authorization/okta`.

In local development, Vite serves the app on port `5173` and proxies backend/API/auth traffic to Spring Boot on port `8080`. In production, the Gradle backend build compiles the frontend and packages `frontend/dist` into the Spring Boot JAR under `BOOT-INF/classes/static`.

## Technology Stack

- React 19 for UI components.
- TypeScript with strict compiler settings.
- Vite 7 for local dev server, hot module replacement, and production builds.
- React Router 7 for client-side routing.
- Tailwind CSS 4 through `@tailwindcss/vite` for styling.
- Day.js for date/time handling.
- Lucide React for icons.
- Vitest, jsdom, React Testing Library, and jest-dom for unit/component tests.
- ESLint 9 with TypeScript, React Hooks, and React Refresh rules.
- npm with `package-lock.json` for dependency locking.

## Directory Layout

```text
frontend/
  src/
    api/              Backend API wrappers and shared fetch behavior
    auth/             Auth provider, auth hook, and route guard
    components/       Shared UI components
    components/calendar/
                      Calendar-specific components and types
    pages/            Route-level screens
    styles/           Shared style helpers
    util/             Parsing, date/time, navigation, and app event helpers
    App.tsx           Application routes and authenticated app shell
    main.tsx          React entry point
    types.ts          Shared frontend types
  tests/
    setup.ts          Vitest test setup and cleanup
    unit/             Unit and component tests
  vite.config.ts      Development/build config
  vitest.config.ts    Test runner config
  eslint.config.js    Lint config
  tsconfig*.json      TypeScript project configs
  package.json        npm scripts and dependencies
  package-lock.json   Locked dependency versions
```

## Prerequisites

- Node.js compatible with Vite 7. Use a current LTS release that satisfies Vite's Node requirement.
- npm.
- Java 21 and the backend dependencies if running the full application locally.
- A local backend on `http://localhost:8080` for authenticated app flows and API calls.

## Install Dependencies

From the frontend directory:

```bash
cd frontend
npm ci
```

Use `npm ci` for reproducible installs from `package-lock.json`. Use `npm install` only when intentionally changing dependencies or regenerating the lockfile.

## Running In Development Mode

Start the backend first from `backend/`:

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

Then start the frontend from `frontend/`:

```bash
npm run dev
```

The Vite app runs at:

```text
http://localhost:5173
```

The Vite dev server proxies these paths to the backend at `http://localhost:8080`:

- `/api`
- `/oauth2`
- `/login`
- `/logout`

This lets the frontend use same-origin paths and browser cookies while the backend handles OAuth2 login, logout, sessions, CSRF, and API authorization.

## Running Tests

Run the frontend test suite once:

```bash
cd frontend
npm test
```

Run tests in watch mode while developing:

```bash
npm run test:watch
```

Tests run with Vitest using the `jsdom` environment. The shared setup file is `frontend/tests/setup.ts`; it installs jest-dom matchers, runs React Testing Library cleanup after each test, and restores Vitest mocks/globals.

## Linting

Run ESLint from `frontend/`:

```bash
npm run lint
```

The lint config applies to TypeScript and TSX files, ignores `dist`, and includes recommended rules for JavaScript, TypeScript, React Hooks, and React Refresh/Vite.

## Building For Production

The production setup builds the frontend into the backend when `./gradlew bootJar` runs from `backend/`.

Build the frontend directly:

```bash
cd frontend
npm run build
```

This runs:

```bash
tsc -b && vite build
```

The TypeScript build validates the app and Node/Vite config projects. Vite then writes production assets to `frontend/dist`.

## Previewing A Production Build

After `npm run build`, preview the built frontend locally:

```bash
npm run preview
```

`vite preview` serves the static build for a quick production-bundle sanity check. It does not replace the Spring Boot production runtime and does not provide backend API behavior by itself.

## Backend-Integrated Build

From `backend/`, the Gradle `bootJar` task builds and packages both backend and frontend:

```bash
cd backend
./gradlew bootJar
```

The backend build defines these frontend-related tasks:

- `installFrontend`: runs `npm install` in `frontend/`.
- `buildFrontend`: depends on `installFrontend` and runs `npm run build`.
- `bootJar`: depends on `buildFrontend` and copies `frontend/dist` into the Spring Boot JAR.

The resulting JAR serves both the API and the compiled frontend from the embedded Spring Boot server.

## Application Routing

The app uses `BrowserRouter` in `src/main.tsx` and route definitions in `src/App.tsx`.

Public routes:

- `/` renders the welcome page.
- `/login` renders the login page.
- `/logout` renders the logout page.

Protected routes:

- `/app/*` is wrapped by `RequireAuth`.
- Unauthenticated users are redirected to `/login`.
- While auth state is loading, the app renders `LoadingPage`.

Role-gated routes:

- Users with role `AT` or `ADMIN` can access admin/trainer routes.
- Non-privileged users attempting privileged routes are redirected to `/app/home`.

Important authenticated routes include:

- `/app/home`
- `/app/reserveEquipment`
- `/app/profile`
- `/app/admin/settings`
- `/app/admin/users`
- `/app/equipmentTypes`
- `/app/createEquipment`
- `/app/allEquipment`
- `/app/equipment/:equipmentId/edit`

Note: `AppShell` currently redirects privileged users from `/app` and `/app/reserveEquipment` to `/app/admin/reservations`. If that route is not implemented, those redirects should be updated or the admin reservations route should be added.

## Auth And API Access

Auth state lives in `src/auth/AuthContext.tsx`.

Key behavior:

- On app load, the provider calls `/api/user` to determine the current session.
- Authenticated sessions are refreshed silently every 60 seconds.
- `login()` redirects to `/oauth2/authorization/okta`.
- `logout()` redirects to `/api/logout`.

All frontend API modules should use `apiFetch` from `src/api/apiFetch.ts` rather than raw `fetch`.

`apiFetch` does three important things:

- Always sends `credentials: "include"` so browser session cookies are included.
- Adds the `X-XSRF-TOKEN` header for unsafe HTTP methods when the `XSRF-TOKEN` cookie is present.
- Fetches `/api/csrf` first when an unsafe method needs a CSRF token and none is available.

Unsafe methods are any methods outside `GET`, `HEAD`, `OPTIONS`, and `TRACE`.

## Data Flow Conventions

- API modules in `src/api/` isolate backend request details from pages/components.
- Pages should call API wrapper functions instead of duplicating request logic.
- Parsing helpers in `src/util/` convert backend response shapes into frontend-friendly structures.
- Shared app-level calendar state and reservation refresh logic live in `AppShell` inside `src/App.tsx`.
- Reservation data refreshes on initial load, relevant custom app events, focus/visibility changes, and a 30-second visible-tab interval.
- App settings from `/api/admin/settings` drive calendar window, time step, maximum reservation time, and weekend blocking behavior.
- Reservation create and edit controls must use the configured maximum reservation time when building end-time choices. Do not hardcode a 30-minute edit limit; use the same `maxResTime` setting that the booking flow uses.
- Athlete home notifications use `src/api/Notifications.ts` and poll unread notification state while the user is active in the app.

## Adding New Frontend Features

When adding a new backend-backed feature:

1. Add or update shared types in `src/types.ts` when the type is used across multiple modules.
2. Add a focused API wrapper in `src/api/` and call `apiFetch` from that wrapper.
3. Parse backend DTOs in `src/util/` if the UI shape differs from the backend shape.
4. Add route-level UI in `src/pages/` and reusable UI in `src/components/`.
5. Add or update routes in `src/App.tsx`.
6. Wrap privileged routes with the existing `renderForPrivileged` pattern.
7. Add unit/component tests under `tests/unit/`.
8. Run `npm run lint`, `npm test`, and `npm run build` before merging.

## Security

### Session And CSRF

- Use `apiFetch` for every backend call. Do not bypass it unless there is a documented reason.
- Do not manually store OAuth tokens, session IDs, or credentials in `localStorage`, `sessionStorage`, or frontend state.
- Keep authentication and authorization decisions enforced by the backend. Frontend route guards improve UX but are not a security boundary.
- For `POST`, `PUT`, `PATCH`, and `DELETE`, rely on `apiFetch` to attach the CSRF token.
- If adding a new API module, test at least one unsafe request path to confirm CSRF behavior still works.

### Secrets And Configuration

- Do not put secrets in frontend code, Vite config, `.env` files committed to git, or built assets.
- Only expose frontend environment variables intentionally. Vite exposes variables prefixed with `VITE_` to browser code.
- Treat any value in the frontend bundle as public.
- OAuth client secrets, database passwords, and signing secrets must stay server-side and should be supplied through environment-specific backend configuration.

### Dependency Safety

- Commit `package-lock.json` whenever dependencies change.
- Prefer `npm ci` in CI and reproducible local setup.
- Run dependency audits during maintenance:

```bash
cd frontend
npm audit
```

- Review audit output before running automatic fixes. `npm audit fix --force` can introduce breaking major-version upgrades and should not be used blindly.
- Remove unused dependencies instead of leaving them in `package.json`.
- Watch major framework upgrades carefully, especially React, React Router, Vite, Vitest, Tailwind, and TypeScript.

### Generated Artifacts

- `frontend/dist/` is production build output.
- `frontend/coverage/` is generated test coverage output. Do not update it manually, and leave it out of commits unless the project intentionally tracks refreshed coverage reports.

### Browser Security

- Avoid `dangerouslySetInnerHTML`. If unavoidable, sanitize content server-side and document the threat model.
- Validate and encode user-controlled data before rendering it in unusual contexts such as URLs, HTML attributes, or generated schemas.
- Use React's normal rendering for text content so React escapes it.
- Avoid building navigation targets from untrusted absolute URLs. Prefer internal route constants or validated relative paths.
- Keep production served over HTTPS. Session cookies and OAuth redirects should be configured accordingly by the backend and reverse proxy.

### Access Control

- Keep admin/trainer UI checks aligned with backend roles: `AT` and `ADMIN` are privileged in the frontend.
- Never assume hiding a button or route prevents access. Backend endpoints must check permissions.
- When adding a privileged action, update both frontend route/UI gating and backend authorization/tests.

## Keeping The Frontend Up To Date

Recommended maintenance loop:

```bash
cd frontend
npm outdated
npm audit
npm run lint
npm test
npm run build
```

When updating dependencies:

1. Update one logical group at a time, for example test tooling, router, or styling.
2. Read migration notes for major versions before upgrading.
3. Run the full frontend verification commands.
4. Smoke-test login, logout, protected routes, admin routes, reservation creation, reservation cancellation, equipment management, and app settings.
5. Build the backend JAR with `./gradlew bootJar` to confirm the integrated production artifact still works.

Use `npm update` for compatible semver updates:

```bash
cd frontend
npm update
```

Use explicit installs for intentional major upgrades:

```bash
npm install react@latest react-dom@latest
```

After any dependency update, commit both `package.json` and `package-lock.json`.

## Verification Checklist

Before opening a pull request or deploying frontend changes, run:

```bash
cd frontend
npm run lint
npm test
npm run build
```

For production packaging changes, also run:

```bash
cd backend
./gradlew bootJar
```

Manual checks:

- Public welcome/login pages load.
- Login redirects through Okta and returns to `/app/home`.
- Logout clears the session and returns to the public flow.
- Athlete users cannot access admin/trainer routes.
- `AT` and `ADMIN` users can access admin/trainer routes.
- Reservation, equipment, settings, and notification workflows still call the backend successfully.
- Hard refreshes on protected routes work when served by the Spring Boot app.
