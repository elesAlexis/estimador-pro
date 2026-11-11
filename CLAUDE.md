# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Estimador Pro" is a client-only React 19 + Vite 6 SPA for estimating software projects: sprints contain tasks with durations in business days, and the app lays them out in a cascading schedule that skips weekends and Colombian public holidays. There is no backend — all state lives in `localStorage`. UI text, comments, and identifiers in the domain (e.g. `planeacion`, `alta/media/baja`) are in Spanish; keep new code consistent with that.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # production build to dist/
npm run preview  # serve the built dist/
npm test         # unit tests (node:test) for domain, application and infrastructure

# single file / tests matching a name
node --import ./scripts/register-test-loader.mjs --test src/domain/metrics.test.js
node --import ./scripts/register-test-loader.mjs --test --test-name-pattern="pondera" "src/**/*.test.js"
```

Tests use Node's built-in `node:test` (no dependencies) and live next to the code as `*.test.js`. `scripts/test-loader.mjs` lets Node resolve the extensionless relative imports that Vite allows. Vitest could not be installed because the corporate proxy breaks npm's TLS (`SELF_SIGNED_CERT_IN_CHAIN`). There is no linter or TypeScript, and React components have no tests — verify UI changes with `npm run build` and by running the app.

## Architecture

**Layers** — the code follows Clean Architecture; dependencies point inward. `src/architecture.test.js`
**enforces this rule inside `npm test`**: it reads every import in `src/` and fails on a violation. It also
enforces that only `App.jsx` imports from `infrastructure/`. Both allowlists are empty — a new violation
breaks the build, and fixing one requires deleting its line (a stale exception fails too).

| Layer | May import from |
|---|---|
| `shared/` | `shared/` |
| `domain/` | `domain/`, `shared/` |
| `application/` | `application/`, `domain/`, `shared/` |
| `infrastructure/` | `infrastructure/`, `application/`, `domain/`, `shared/` |
| presentation (`components/`, `pages/`, `context/`, `utils/`, `App.jsx`) | anything |

Test files are exempt — they legitimately cross layers.

- `src/domain/` — pure business rules, no React/network/storage (see below).
- `src/application/` — `projectActions.js` (action types + creators; IDs are generated here so the reducer stays pure), `projectReducer.js` (all sprint/task state transitions), `projectValidation.js` (the input boundary: normalizes imports and repository data), `exportReadiness.js`, `ports.js` (JSDoc contracts `ProjectRepository`, `HolidayProvider`, `GitlabApi`, `RemoteBindingJournal`), and `application/gitlab/` — everything that speaks GitLab's wire format (see **GitLab integration**).
- `src/infrastructure/` — implementations of those ports: `localStorageProjectRepository.js` and `holidayProvider.js`. External dependencies (`fetch`, storage, clock) are factory parameters so tests inject fakes instead of touching the browser.
- `src/shared/` — pure helpers any layer may import (calendar dates).
- `src/context/`, `src/components/`, `src/pages/` — presentation. Large components are split into subfolders: `components/gantt/` (timeline math in `ganttTimeline.js`, unit-tested), `components/sprint/` (`useTaskDragAndDrop` hook, header, column headers) and `components/dashboard/` (KPI cards, scope note, donut chart card, per-module progress, summary table). `src/utils/` is presentation-side only: `jsonBackup.js`, `pdfExport.js`, `htmlProgressExport.js`, `markdown.js` and `templateData.js` (**theme only**).
- `src/App.jsx` is the composition root: it creates the repository, the holiday provider, the GitLab journal and the GitLab defaults (the `VITE_GITLAB_*` env vars), and passes them plus the `createGitlabSession`/`createGitlabApi` factories to `ProjectProvider` and `GitlabProvider`. No other presentation file imports from `infrastructure/`. The factories **must** stay module-scope function references — `GitlabContext` memoizes the OAuth session on them, so an inline arrow would recreate and log out the session on every render.
- Code splitting: `DashboardPage` (recharts) is `React.lazy` in `App.jsx`; `pdfExport.js` (jsPDF) and `htmlProgressExport.js` (with `domain/progressReport.js`) are loaded with dynamic `import()` in `Header.jsx`. Keep all of them out of static imports, or the initial bundle grows back to ~1 MB — `Header.jsx` is in the eager bundle, so anything it imports statically ships on first load. An `ErrorBoundary` around the routes shows a recovery message instead of a blank page.

**State** — `src/context/ProjectContext.jsx` wires the project reducer into separate contexts. Persistence and holiday loading live in `useProjectPersistence` and `useProjectCalendar`; use the narrowest hook:
- `useProjectState()` — `projectInfo`, raw `sprints`, derived `calculatedSprints` (with `sprintStart/sprintEnd`, per-task `calculatedStart/calculatedEnd`, and `calculatedWbs` = `sprintIdx.taskIdx`), `totals`, `calendarValidation`. Display `calculatedSprints`; act on raw ids.
- `useProjectActions()` — stable functions (`addTask`, `updateTask(sprintId, taskId, field, value)`, `moveTask`, `moveSprint`, `cloneSprint`, `loadSprints`, `setProjectInfo`, …). Components never see `dispatch` or action payloads; a new mutation is a creator in `projectActions.js` plus a case in `projectReducer.js`.
- `useHolidays()` — `holidaySet`, `holidayList`, `holidaySource`, `holidayCount`.
- `usePersistence()` — save status, recovery snapshot, retry and recovery-download acknowledgement. Never bypass a blocked recovery to write original data.

Import uses `normalizeProject` and the single `replaceProject` action, so information and sprints change together. The repository returns explicit read/write results (see `application/ports.js`). Corrupt originals are retained, automatic writes are suspended, and recovery archives use `ep_recovery_*`. See `VALIDACION.md` for the no-dependency browser verification fixture and remaining verification limits.

**Persistence** — the injected repository reads/writes `ep_projectInfo` and `ep_sprints`; the persistence hook saves on change unless recovery is blocked. Both writes must succeed before showing Saved. Holiday caches use `ep_holidays_<year>` (30-day TTL). The `client` field is free text (no fixed default). `src/application/projectValidation.js` normalizes imports and repository data before they enter the application.

**Domain layer** — `src/domain/` holds pure business rules (no React, network, or storage):
- `schedule.js` — `calculateSprintDates`: tasks run strictly sequentially across all sprints (no parallelism/dependencies); each starts on the next business day after the previous one ends, skipping weekends and the `holidaySet`. Tasks whose `duration` is not a positive integer (`isValidDuration`) get `null` dates without breaking the cascade.
- `holidays.js` — the 18 Colombian holidays (Easter algorithm + Ley Emiliani Monday moves), `isHoliday`, `getHolidayName`, `getHolidaysNear`.
- `metrics.js` — single source for durations and progress: only valid durations count, and progress is weighted by duration for sprints and the whole project (`calculateProgress`, `calculateProjectTotals`). Don't recompute days/progress in components.
- `project.js` — `createDefaultProjectInfo`, `applyProjectRules`.
- `integration.js` — `publicIntegration` (strips everything that is not public config), `gitlabTarget`, and `gitlabOrigin` (server URL rule: HTTPS only, no credentials, query or fragment).
- `remoteSync.js` — vendor-neutral sync rules: `threeWayChanges` (local vs remote vs conflict) and the metadata the estimator embeds in a description to recognize what it created (`originMarker`, `readMetadata`, `descriptionWithMetadata`, `withoutMetadata`). Nothing here names a GitLab field.
- `taskCatalog.js` / `templates.js` — business catalogs and seed data. `TASK_TYPE_LABELS`, `PRIORITY_LABELS`, `PROJECT_STATUS_LABELS` plus the `isTaskType`/`isPriority`/`isProjectStatus` guards used by `projectValidation.js`; `BASE_TEMPLATE` and `COMMON_TASKS_BANK`. A new task type is added **here first**, then given colors in `utils/templateData.js`.
- `calendarRange.js` — `calendarYearRange`: which years of holidays to load, stretching to twice the total duration with a one-year floor.
- `sprints.js` — `getNextSprintName`: new sprints are numbered after the highest existing "Sprint N".

**Dates** — `src/shared/calendarDate.js` treats dates as local civil days in `YYYY-MM-DD` form. Always use `parseCalendarDate`/`toDateKey`/`shiftDateKey` instead of `new Date('YYYY-MM-DD')`, which parses as UTC and shifts the day in Colombia's timezone.

**Holidays** — `src/infrastructure/holidayProvider.js` (`createHolidayProvider`) checks the 30-day cache, then tries the Nager.Date API (`date.nager.at`, 5s timeout), and falls back to `calculateColombianHolidays` from the domain. `ProjectProvider` computes the year range to load from the project start date and total duration. Two holidays can fall on the same date (e.g. 2025-06-30), so a year's list may hold 18 entries with only 17 distinct dates.

**Pages/routing** — `react-router-dom` (`HashRouter`) with three routes: `/` → `EstimatorPage` (project info card + editable `SprintCard`/`TaskRow` list), `/dashboard` → `DashboardPage` and `/gitlab` → `GitlabPage`. `DashboardPage` is the **single reading of the project**: it holds both the estimation (recharts pie charts + `CustomGanttChart`, a hand-built Gantt, effort per sprint) and the execution at the cut-off date (the four progress KPIs, the product-scope note and per-module progress), all derived from one `buildProgressReport` call memoized in the page. There was a separate `/avance` report page with its own executive Gantt, sprint-status table and GitLab comment detail; it was merged into the dashboard and deleted, so `/analisis`, `/analisis/avance` and `/avance` survive only as `Navigate` redirects for links shared before the merge. Drag-and-drop uses native HTML5 DnD with custom MIME types (`application/sprint` for sprint reordering in `EstimatorPage`; tasks handled in `SprintCard`/`TaskRow`) to keep sprint and task drags from interfering.

**Static config** — `src/utils/templateData.js` holds only the **visual theme**: it rebuilds `TASK_TYPES`, `PRIORITY_CONFIG` and `PROJECT_STATUS` by merging the domain's labels with colors, CSS classes and emojis, **driven by the domain's key order** (that order is the `<option>` order in `TaskRow` and the Gantt legend — `templateData.test.js` pins it). `ROLE_COLORS` lives here too.

**Export** — `src/utils/pdfExport.js` (PDF via `jspdf` + `jspdf-autotable`, a side-effect import that patches `doc.autoTable`), `src/utils/jsonBackup.js` (backup/restore) and `src/utils/htmlProgressExport.js` (standalone progress report, exported from the Header's Export menu; it embeds its own CSS and shares nothing with `index.css`).

## GitLab integration

Optional: the app works fully offline and GitLab only mirrors the estimate onto issues and milestones.

**Where each concern lives** — this split is what keeps `domain/` free of GitLab:
- `domain/remoteSync.js` — the merge engine and the embedded metadata. Vendor-neutral.
- `application/gitlab/` — **the only place that speaks GitLab's wire format**. `gitlabMapping.js` builds and reads payloads (`iid`, `milestone_id`, `assignee_ids`, `state_event`, `labels`) and exports `GITLAB_OPERATIONS`, the dispatch table that maps a kind (`issue`/`milestone`) to its API methods and id field. `gitlabSync.js` prepares and executes a sync; `fetchGitlabProject.js`, `issueComments.js` and `gitlabReleases.js` are the other use cases.
- `infrastructure/` — transport and side effects only: `gitlabApi.js` (REST + one GraphQL query for issue dates), `gitlabOAuth.js` (PKCE; tokens live in memory only, never in storage) and `gitlabJournal.js`.
- `App.jsx` composes the three.

**`remote.base` is an opaque vendor snapshot.** `task.remote.base` / `sprint.remote.base` are photographs of the GitLab payload, persisted in `ep_sprints` and used as the base of the three-way merge. **Renaming their fields invalidates every stored project**, so they keep GitLab's names forever. Exactly two modules may name those fields:
- `application/gitlab/remoteFields.js` — reads them.
- `application/projectValidation.js` (`remoteLink`) — validates them. Its sorting of `labels` and `assignee_ids` is **load-bearing**, not cosmetic: `remoteSnapshot` sorts too and `threeWayChanges` compares with `JSON.stringify`, so an unsorted snapshot would invent a change and a conflict on every reload.

**Derived fields are projections, never persisted.** `decorateRemoteFields` adds `remoteEnd` and `moduleLabel` to tasks in `ProjectContext`, right before `calculateSprintDates`. They are recomputed from `sprints` on every render, so they cannot go stale after a sync replaces `remote`; and `normalizeSprints` builds each task from a fixed field list, so they are structurally dropped on save. `remoteFields.js` **imports nothing on purpose** — `ProjectContext` is in the eager bundle, and any import would drag the whole GitLab adapter into the initial load.

`remoteEnd` carries **key presence**, not just a value: `due_date: null` means "GitLab says there is no date" and leaves the task without an end, while the absence of the key lets the local `plannedEnd` win. That is why the projection spreads `{}` instead of `{ remoteEnd: undefined }`, and why the tests assert with `Object.hasOwn`.

## Known issues

- `remoteSnapshot` stores `due_date` without validating its format, while `importGitlabProject` runs `plannedEnd` through `validDate`. A malformed GitLab date can therefore reach `calculatedEnd` through `remoteEnd`. Fixing it changes behavior, so it is left as is.
- `src/components/GitlabReleases.jsx` is **not mounted on any route**. Its use case (`application/gitlab/gitlabReleases.js`) is complete and tested; only the screen was never wired up.
- `CACHE_ISSUE_COMMENTS` has no emitter left. The deleted progress page was the only screen that cached GitLab comments, so the persisted `remoteComments` field is now **read-only**: the HTML report still exports whatever was stored before, and `TaskDetailsPanel` loads comments live instead. The action, its reducer case and `projectValidation`'s handling are kept on purpose — dropping them would silently discard comments already in `localStorage`. Wiring `cacheIssueComments` into `TaskDetailsPanel` (which already receives `cacheEntries` from `loadIssueComments`) would give the field a producer again.

**Styling** — Tailwind v4 via `@tailwindcss/vite` (`@import "tailwindcss"` in `src/index.css`), but most components use inline `style={{}}` objects plus CSS custom properties and named classes defined in `src/index.css` (brand navy `#002160`, lime `#C4D600`, teal `#00607F`). Follow the existing inline-style + CSS-variable pattern rather than introducing Tailwind utility classes piecemeal.

## Non-source files at the root

- `base.txt` — the original single-file prototype of the app (superseded by `src/`); reference only.
- `temp.zip` / `xlsx_temp/` — an unpacked Excel workbook used as a reference; `vite.config.js` ignores `*.xlsx` in the file watcher.

These loose files are listed in `.gitignore`: they stay on disk but are not versioned.
