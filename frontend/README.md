# GamePlan Frontend

React, TypeScript, and Vite single-page app for GamePlan. The app lives in `frontend/`, talks to the Spring Boot backend through same-origin API paths, and is packaged into the backend JAR for production.

For the full frontend manual, see `../documentation/manuals/FrontendDeveloperGuide.md`.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router 7
- Tailwind CSS 4
- Day.js
- Lucide React
- Vitest, jsdom, React Testing Library, and jest-dom
- ESLint 9

## Install

```bash
npm ci
```

Use `npm ci` for normal setup from `package-lock.json`. Use `npm install` only when intentionally changing dependencies.

## Development

Start the backend from `../backend`:

```bash
./gradlew bootRun
```

Then start Vite from this directory:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Vite proxies `/api`, `/oauth2`, `/login`, and `/logout` to the backend at `http://localhost:8080` so session cookies, OAuth2 redirects, logout, and CSRF behavior work with same-origin frontend paths.

## Scripts

```bash
npm run lint
npm test
npm run test:watch
npm run build
npm run preview
```

`npm run build` runs `tsc -b && vite build` and writes production assets to `dist/`.

## Production Packaging

The backend `bootJar` task builds and packages the frontend:

```bash
cd ../backend
./gradlew bootJar
```

Gradle runs the frontend build and copies `frontend/dist` into the Spring Boot JAR under `BOOT-INF/classes/static`.

## Project Layout

```text
src/
  api/                 Backend API wrappers and shared apiFetch behavior
  auth/                Auth provider, hooks, and route guard
  components/          Shared UI components
  components/calendar/ Calendar components and types
  pages/               Route-level screens
  styles/              Shared style helpers
  util/                Parsing, time, navigation, and app event helpers
  App.tsx              Authenticated app shell and routes
  main.tsx             BrowserRouter/AuthProvider entry point
  types.ts             Shared frontend types
tests/
  setup.ts             Vitest setup
  unit/                Unit and component tests
```

## Development Rules

- Use API wrappers in `src/api/` and call `apiFetch` instead of raw `fetch` for backend calls.
- Add shared types to `src/types.ts` when multiple modules need them.
- Keep route-level UI in `src/pages/` and reusable UI in `src/components/`.
- Add or update tests under `tests/unit/` for behavior changes.
- Run `npm run lint`, `npm test`, and `npm run build` before merging frontend changes.

## Generated Files

`dist/` is build output. `coverage/` is generated test coverage output; do not update it manually. If coverage artifacts are not intentionally part of a change, leave them out of commits.
