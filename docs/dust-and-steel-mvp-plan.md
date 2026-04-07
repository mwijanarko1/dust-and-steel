# Dust and Steel MVP Plan

## Summary

Build `Dust and Steel` as a desktop-first web tactics game with a `Three.js + TypeScript` core, instant-load presentation, and one-battle sessions lasting `5-10 minutes`. Each match randomizes the player into `attacker` or `defender`, uses `objectives + morale break` as the primary victory loop, and supports `field` and `siege-lite` battle variants. The jam version includes all eras as playable, but content is tightly capped to keep quality achievable: `2 factions per era`, `8-12 controllable units per side`, and one generic engine with era-specific doctrine/data.

## Product Scope

- Playable eras at launch:
  - Crusades / Ayyubid
  - World War II
  - Modern
- Content budget per era:
  - 2 factions
  - 6-8 unit archetypes per faction
  - 1 field map theme
- Session format:
  - Single battle only
  - Random attacker/defender assignment on battle start
  - Pure real-time controls
  - Desktop mouse/keyboard only
- Core battle fantasy:
  - Ancient eras emphasize formation cohesion, morale, flank pressure, cavalry shock
  - Modern eras emphasize spread formations, cover, suppression, ranged fire, loose doctrine
- Future direction:
  - Architecture should stay deterministic-friendly enough for future async or PvP multiplayer
  - No multiplayer implementation in MVP

## Tech Stack

- App shell: `Vite`
- Language: `TypeScript` in strict mode
- Renderer: `Three.js`
- UI layer: `React` for menus, HUD, overlays, battle summary
- UI state only: `Zustand` if needed for menus/settings/HUD state
- Simulation: plain TypeScript modules, fixed timestep, not stored in React state
- Tests:
  - `Vitest` for sim/data/rules tests
  - `Playwright` for smoke tests after the first playable vertical slice
- Build target:
  - Static web deploy
  - No login
  - No heavy startup downloads
  - No loading screen gate before first interaction

## Architecture

## Engine Layout

- `src/app`
  - boot, routing, shell, settings, battle entry
- `src/ui`
  - React HUD, pause menu, era select, faction select, battle results
- `src/rendering`
  - scene setup, camera rig, terrain renderer, unit visuals, projectile/effect systems, selection/highlight rendering
- `src/simulation`
  - fixed-step game loop, orders, movement, combat, morale, visibility, objective logic, AI
- `src/content`
  - eras, factions, units, doctrines, maps, audio metadata, balance constants
- `src/shared`
  - math, RNG, IDs, event types, serializers, shared enums/constants

## Core Runtime Rules

- `Three.js` owns the battlefield scene and frame loop
- React never owns unit state or per-frame battlefield transforms
- Simulation runs on a fixed timestep, rendering interpolates from sim state
- Era differences are data-driven through doctrine and unit definitions, not separate engines
- Field and siege-lite are map presets using the same order/combat framework

## Gameplay Systems

- Orders:
  - move
  - attack-move
  - hold
  - defend-point
  - fallback
  - face-direction
  - use-ability
- Shared battle systems:
  - health
  - morale
  - stamina
  - suppression
  - line-of-sight
  - terrain modifiers
  - objective control
- Era tuning through data:
  - `formationMode`
  - spacing
  - cohesion decay
  - projectile profile
  - reload cadence
  - cover value
  - charge impact
  - routing threshold
  - AI aggression profile

## Public Interfaces / Types

- `BattleConfig`
  - selected era, factions, map type, seed, attacker/defender assignment, unit caps, objective set
- `EraDefinition`
  - id, label, doctrine defaults, available factions, visual theme, audio theme
- `FactionDefinition`
  - id, eraId, roster, doctrine overrides, palette, banner/icon assets
- `UnitArchetype`
  - id, role, era, faction, size, speed, armor, morale, weapon profiles, spacing model, abilities
- `DoctrineProfile`
  - formation behavior, preferred engagement range, regroup rules, flanking weight, cover bias
- `MapDefinition`
  - id, type (`field` | `siegeLite`), lanes/objectives, terrain tags, deployment zones, prop budget
- `OrderCommand`
  - unitId, commandType, targetPosition or targetUnitId, queuedAtTick
- `BattleSnapshot`
  - serializable battle state for replay/debug/future sync work
- `MatchResult`
  - winner, routedFaction, objectivesHeld, losses, durationSeconds, seed

## Implementation Phases

## Phase 0: Repo Grounding

- Create `docs/CODEBASE_MAP.md` first because the repo currently has no map and the workspace policy requires one before substantial implementation
- Scaffold the app only after the map exists
- Keep the initial dependency set minimal

## Phase 1: Vertical Slice Skeleton

- Scaffold `Vite + TypeScript`
- Add React shell and a single Three.js battle scene
- Implement battle boot flow:
  - splash/menu
  - era select
  - faction select
  - randomized attacker/defender
  - start battle
- Add one temporary field map and one temporary siege-lite map
- Add one temporary faction pair to validate the whole loop

## Phase 2: Simulation Core

- Fixed timestep loop
- Unit selection and command issuing
- Objective capture logic
- Morale and routing
- Melee/ranged combat resolution
- Basic AI for attacker and defender
- Battle end conditions and summary screen

## Phase 3: Doctrine System

- Implement doctrine-driven unit behavior so ancient and modern eras diverge through data
- Ancient doctrine:
  - tight cohesion
  - strong flank penalties
  - charge bonuses
  - shorter ranges
- Modern doctrine:
  - loose spacing
  - cover preference
  - suppression
  - longer engagement ranges
- Ensure the same renderer and sim support both without branching into separate codepaths per era

## Phase 4: Content Completion

- Add 2 factions for each era
- Add 6-8 unit archetypes per faction
- Add 1 field theme and 1 siege-lite theme per era
- Replace placeholders with stylized tabletop visuals:
  - readable silhouettes
  - strong faction colors
  - low-download geometry
  - lightweight particles
- Add faction UI identity and battle readouts

## Phase 5: Polish and Jam Readiness

- Tighten match pacing to `5-10 minutes`
- Improve first-30-seconds readability
- Reduce bundle size and startup cost
- Add lightweight audio cues and map ambience
- Add tutorial hints for selection, issuing orders, and reading morale/objectives

## Testing and Acceptance

## Unit / Rules Tests

- Morale breaks correctly when losses, flank pressure, or objective loss cross thresholds
- Objective capture resolves correctly for attacker and defender
- Doctrine profiles change spacing/cohesion/engagement behavior as expected
- Ranged and melee resolution stay deterministic for a fixed seed
- Match result output is stable and serializable

## Integration Tests

- From menu to battle start works for every era
- Random attacker/defender assignment produces legal spawn setups
- Every era can complete both a field and siege-lite battle without errors
- AI can finish a battle and trigger summary state
- HUD reflects selected units, objectives, and morale state correctly

## Playwright Smoke Tests

- App loads into an interactable state quickly
- Start a battle from each era and reach a visible battlefield
- Pause/resume does not break the sim
- Victory and defeat summary both render cleanly

## Acceptance Criteria

- All five eras are selectable and playable
- Each era has 2 factions and both map types
- Battles run at acceptable framerate on desktop with 8-12 units per side
- A full match finishes in 5-10 minutes
- The player can immediately understand attacker vs defender role and objective state
- The game feels historically distinct per era through doctrine, not just reskins

## Assumptions and Defaults

- “All eras equal depth” means equal gameplay surface and content budget, not cinematic/AAA asset parity
- “Crusades / Ayyubid” is the defined replacement for the vague “muslim time” label
- MVP is single-player only
- Multiplayer is deferred, but simulation should remain snapshot-friendly and deterministic-aware
- Desktop-first means no mobile battlefield support in the jam build
- Pure real-time is kept, but we can still include optional speed controls later if usability demands it
- Siege implementation should be `siege-lite`: gates, walls, chokepoints, breachable entry logic, not full city simulation
- If scope slips, cut faction count within eras last; cut visual variety and map count first
