---
last_mapped: 2026-04-07T00:00:00Z
---

# Codebase Map

## System Overview

`Dust and Steel` is a desktop-first browser tactics game built with:

- `Vite + React + TypeScript` for app shell and UI flow.
- `Three.js` for battlefield rendering.
- A deterministic, fixed-step simulation in plain TypeScript.
- Data-driven era/faction/unit/map definitions under `src/content`.
- `Vitest` and `Playwright` for rules and smoke testing.

The runtime keeps simulation outside React state and uses React only for setup,
HUD, and summary screens.

## Directory Guide

- `docs/`
  - `vibejam.md`: Jam constraints and submission requirements.
  - `dust-and-steel-mvp-plan.md`: Product and architecture contract used for implementation.
  - `CODEBASE_MAP.md`: Current structural map.
- `src/app/`
  - `App.tsx`: Top-level screen flow (`splash -> setup -> battle -> summary`).
  - `gameStore.ts`: Zustand UI/session state.
  - `createBattleConfig.ts`: Deterministic battle config generation (role randomization, map/faction selection).
- `src/content/`
  - `catalog.ts`: Canonical content data:
    - 5 eras (`roman`, `persian`, `ayyubid`, `ww2`, `modern`)
    - 2 factions per era
    - 6 unit archetypes per faction
    - 2 maps per era (`field`, `siegeLite`)
    - doctrine profiles and map metadata
- `src/simulation/`
  - `battleSimulator.ts`: Fixed-step combat model, AI, morale, objective capture, routing, and victory logic.
  - `battleRuntime.ts`: Bridge between simulator and renderer (RAF loop, pause, fast-forward, command dispatch).
  - `__tests__/`: Simulation-focused test suite.
- `src/rendering/`
  - `BattleRenderer.ts`: Three.js scene, units, objectives, input raycasting, and camera controls.
- `src/ui/`
  - `SplashScreen.tsx`, `SetupScreen.tsx`, `BattleHud.tsx`, `SummaryScreen.tsx`: UI surfaces.
- `src/shared/`
  - `types.ts`: Public domain interfaces (`BattleConfig`, `EraDefinition`, `UnitArchetype`, etc.).
  - `math.ts`, `rng.ts`, `serialize.ts`: utilities.
- `e2e/`
  - `smoke.spec.ts`: End-to-end startup and fast-forward flow checks.

## Key Workflows

- Install dependencies:
  - `bun install`
- Run dev server:
  - `bun run dev`
- Run unit/integration-style tests:
  - `bun run test`
- Run E2E smoke tests:
  - `bun run test:e2e`
- Build production bundle:
  - `bun run build`

## Known Risks

- Bundle size warning persists (`~729kB` main chunk); code splitting is a pending optimization.
- Renderer fallback is intentionally defensive for headless/WebGL-limited environments.
- Multiplayer is not implemented; simulator is deterministic-friendly but not network-authoritative yet.
