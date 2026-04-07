import { ERA_IDS, GAME_CONTENT } from "@/content/catalog";
import type { BattleConfig, BattleSnapshot, EraId, UnitSnapshot } from "@/shared/types";

export const JAM_PORTAL_2026 = "https://jam.pieter.com/portal/2026";

const PORTAL_TRIGGER_RADIUS = 14;

export interface PortalWorldPositions {
  exit: { x: number; z: number };
  start: { x: number; z: number };
}

export function isPortalEntryFromUrl(search: string): boolean {
  return new URLSearchParams(search).get("portal") === "true";
}

export function getRefFromUrl(search: string): string | null {
  const raw = new URLSearchParams(search).get("ref");
  if (!raw || raw.trim() === "") {
    return null;
  }
  return raw.trim();
}

export function parseEraFromUrl(value: string | null): EraId {
  if (value && (ERA_IDS as readonly string[]).includes(value)) {
    return value as EraId;
  }
  return "ayyubid";
}

export function parseSeedFromUrl(value: string | null): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function getPortalWorldPositions(mapWidth: number, mapDepth: number): PortalWorldPositions {
  const hw = mapWidth * 0.5;
  const hd = mapDepth * 0.5;
  return {
    exit: { x: hw - 10, z: hd * 0.15 },
    start: { x: -hw + 10, z: -hd * 0.15 }
  };
}

function horizontalDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function anyPlayerUnitInPortalRadius(
  snapshot: BattleSnapshot,
  config: BattleConfig,
  center: { x: number; z: number },
  radius: number = PORTAL_TRIGGER_RADIUS
): boolean {
  return snapshot.units.some(
    (unit) =>
      unit.side === config.playerRole && !unit.isRouted && horizontalDistance(unit.position, center) < radius
  );
}

function averagePlayerHpPercent(snapshot: BattleSnapshot, config: BattleConfig): number | null {
  const playerUnits = snapshot.units.filter((u) => u.side === config.playerRole && !u.isRouted);
  if (playerUnits.length === 0) {
    return null;
  }
  let sum = 0;
  let count = 0;
  for (const unit of playerUnits) {
    const archetype = GAME_CONTENT.unitArchetypes[unit.archetypeId];
    const max = archetype?.maxHealth ?? 120;
    if (max <= 0) {
      continue;
    }
    sum += Math.round((unit.health / max) * 100);
    count += 1;
  }
  if (count === 0) {
    return null;
  }
  return Math.max(1, Math.min(100, Math.round(sum / count)));
}

function averagePlayerSpeed(snapshot: BattleSnapshot, config: BattleConfig): number {
  const playerUnits = snapshot.units.filter((u) => u.side === config.playerRole && !u.isRouted);
  if (playerUnits.length === 0) {
    return 2;
  }
  let sum = 0;
  let n = 0;
  for (const unit of playerUnits) {
    const archetype = GAME_CONTENT.unitArchetypes[unit.archetypeId];
    const speed = archetype?.speed ?? 4;
    sum += speed;
    n += 1;
  }
  const avg = sum / n;
  return Math.round(avg * 10) / 10;
}

function dominantPlayerColorHex(snapshot: BattleSnapshot, config: BattleConfig): string | null {
  const first = snapshot.units.find((u) => u.side === config.playerRole);
  if (!first) {
    return null;
  }
  const faction = GAME_CONTENT.factions[first.factionId];
  if (!faction) {
    return null;
  }
  return config.playerRole === "attacker" ? faction.palette.primary : faction.palette.secondary;
}

function samplePlayerUnitMotion(snapshot: BattleSnapshot, config: BattleConfig): UnitSnapshot | null {
  return snapshot.units.find((u) => u.side === config.playerRole && !u.isRouted) ?? null;
}

/**
 * Full URL to the jam portal hub with continuity params. Merges current query string,
 * sets portal=true and ref to this game, and adds telemetry where available.
 */
export function buildJamExitUrl(snapshot: BattleSnapshot, config: BattleConfig): string {
  const params = new URLSearchParams(window.location.search);
  params.set("portal", "true");
  const refBase = `${window.location.origin}${window.location.pathname}`;
  params.set("ref", refBase);

  const color = dominantPlayerColorHex(snapshot, config);
  if (color) {
    params.set("color", color);
  }

  params.set("speed", String(averagePlayerSpeed(snapshot, config)));

  const hp = averagePlayerHpPercent(snapshot, config);
  if (hp !== null) {
    params.set("hp", String(hp));
  }

  const unit = samplePlayerUnitMotion(snapshot, config);
  if (unit) {
    const archetype = GAME_CONTENT.unitArchetypes[unit.archetypeId];
    const spd = archetype?.speed ?? 4;
    params.set("speed_x", String(Math.round(Math.cos(unit.facing) * spd * 10) / 10));
    params.set("speed_z", String(Math.round(Math.sin(unit.facing) * spd * 10) / 10));
    params.set("speed_y", "0");
    params.set("rotation_x", "0");
    params.set("rotation_y", String(Math.round(unit.facing * 1000) / 1000));
    params.set("rotation_z", "0");
  }

  return `${JAM_PORTAL_2026}?${params.toString()}`;
}

/**
 * When entering the start (return) portal, send player back to ref with all current
 * query params except ref (ref is the destination base).
 */
export function buildRefReturnUrl(search: string = window.location.search): string | null {
  const urlParams = new URLSearchParams(search);
  const ref = urlParams.get("ref");
  if (!ref || ref.trim() === "") {
    return null;
  }
  let base = ref.trim();
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }
  try {
    const dest = new URL(base);
    for (const [key, value] of urlParams) {
      if (key === "ref") {
        continue;
      }
      dest.searchParams.append(key, value);
    }
    return dest.toString();
  } catch {
    return null;
  }
}

export { PORTAL_TRIGGER_RADIUS };
