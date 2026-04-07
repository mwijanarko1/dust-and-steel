import { GAME_CONTENT } from "@/content/catalog";
import { clamp, distance, moveTowards, normalize } from "@/shared/math";
import { createRandom } from "@/shared/rng";
import { getEraCombatTuning, MELEE_WEAPON_RANGE_CAP, type EraCombatTuning } from "@/simulation/eraRules";
import type {
  BattleConfig,
  BattleSnapshot,
  MatchResult,
  ObjectiveSnapshot,
  OrderCommand,
  Side,
  UnitSnapshot,
  Vector2
} from "@/shared/types";

interface RuntimeUnit extends UnitSnapshot {
  maxHealth: number;
  maxMorale: number;
  maxStamina: number;
  speed: number;
  armor: number;
  weapon: {
    range: number;
    damage: number;
    reloadSeconds: number;
    suppression: number;
    accuracy: number;
  };
  doctrineId: string;
  cooldown: number;
  abilityCooldown: number;
  fallbackPoint: Vector2;
  orderTarget: Vector2;
  targetUnitId?: string;
}

interface BattleRuntime {
  config: BattleConfig;
  eraCombatTuning: EraCombatTuning;
  units: RuntimeUnit[];
  objectives: ObjectiveSnapshot[];
  elapsedSeconds: number;
  tick: number;
  winner: Side | null;
  lastAiUpdate: number;
  result: MatchResult | null;
  /** Enemy AI stays idle until the player issues a movement-related order. */
  playerHasOrdered: boolean;
}

function sideOpponent(side: Side): Side {
  return side === "attacker" ? "defender" : "attacker";
}

function getFactionIdBySide(config: BattleConfig, side: Side): string {
  const playerSide = config.playerRole;
  if (side === playerSide) {
    return config.playerFactionId;
  }
  return config.enemyFactionId;
}

function createInitialUnits(config: BattleConfig): RuntimeUnit[] {
  const map = GAME_CONTENT.mapsByEra[config.selectedEra].find((definition) => definition.id === config.mapId);
  if (!map) {
    throw new Error(`Map not found: ${config.mapId}`);
  }

  const units: RuntimeUnit[] = [];
  const unitCap = config.unitCap;
  for (const side of ["attacker", "defender"] satisfies Side[]) {
    const factionId = getFactionIdBySide(config, side);
    const faction = GAME_CONTENT.factions[factionId];
    if (!faction) {
      throw new Error(`Faction not found: ${factionId}`);
    }
    const spawn = map.deploymentZones[side];
    const roleDoctrine = GAME_CONTENT.eras[config.selectedEra].doctrineDefaults[side];
    if (!roleDoctrine) {
      throw new Error(`Doctrine missing for ${config.selectedEra}:${side}`);
    }
    const doctrine = GAME_CONTENT.doctrines[roleDoctrine];
    if (!doctrine) {
      throw new Error(`Doctrine not found: ${roleDoctrine}`);
    }
    const spacing = doctrine.spacing;
    const columns = 4;

    for (let i = 0; i < unitCap; i += 1) {
      const baseArchetypeId = faction.roster[i % faction.roster.length];
      if (!baseArchetypeId) {
        throw new Error(`Faction roster is empty: ${faction.id}`);
      }
      const archetype = GAME_CONTENT.unitArchetypes[baseArchetypeId];
      if (!archetype) {
        throw new Error(`Unit archetype not found: ${baseArchetypeId}`);
      }
      const row = Math.floor(i / columns);
      const col = i % columns;
      const columnWidth = (spawn.maxX - spawn.minX) / (columns + 1);
      const startX = spawn.minX + columnWidth * (col + 1);
      const startZ = spawn.minZ + (spawn.maxZ - spawn.minZ) * ((row + 1) / (Math.ceil(unitCap / columns) + 1));
      const sideDirection = side === "attacker" ? 1 : -1;
      const offsetX = (col - 1.5) * spacing;

      units.push({
        id: `${side}_${i + 1}`,
        archetypeId: archetype.id,
        label: archetype.label,
        side,
        factionId,
        position: { x: startX + offsetX, z: startZ },
        facing: sideDirection > 0 ? Math.PI / 2 : -Math.PI / 2,
        health: archetype.maxHealth,
        morale: archetype.maxMorale,
        stamina: archetype.maxStamina,
        suppression: 0,
        isRouted: false,
        currentOrder: "hold",
        maxHealth: archetype.maxHealth,
        maxMorale: archetype.maxMorale,
        maxStamina: archetype.maxStamina,
        speed: archetype.speed,
        armor: archetype.armor,
        weapon: archetype.weapon,
        doctrineId: roleDoctrine,
        cooldown: 0,
        abilityCooldown: 0,
        fallbackPoint: {
          x: side === "attacker" ? 0 : 0,
          z: side === "attacker" ? map.deploymentZones.attacker.minZ - 12 : map.deploymentZones.defender.maxZ + 12
        },
        orderTarget: { x: startX + offsetX, z: startZ }
      });
    }
  }

  return units;
}

function createInitialObjectives(config: BattleConfig): ObjectiveSnapshot[] {
  const map = GAME_CONTENT.mapsByEra[config.selectedEra].find((definition) => definition.id === config.mapId);
  if (!map) {
    throw new Error(`Map not found: ${config.mapId}`);
  }
  return map.objectiveTemplates.map((template) => ({
    id: template.id,
    label: template.label,
    position: template.position,
    radius: template.radius,
    controller: null,
    progress: 0
  }));
}

function computeSpacing(units: RuntimeUnit[], side: Side): number {
  const active = units.filter((unit) => unit.side === side && !unit.isRouted);
  if (active.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  let pairCount = 0;
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const first = active[i];
      const second = active[j];
      if (!first || !second) {
        continue;
      }
      totalDistance += distance(first.position, second.position);
      pairCount += 1;
    }
  }

  return totalDistance / pairCount;
}

function nearestObjective(runtime: BattleRuntime, position: Vector2): ObjectiveSnapshot {
  const objectives = [...runtime.objectives];
  objectives.sort((a, b) => distance(a.position, position) - distance(b.position, position));
  const nearest = objectives[0];
  if (!nearest) {
    throw new Error("No objective present on map");
  }
  return nearest;
}

function stableUnitInt(unitId: string, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < unitId.length; i += 1) {
    h = (Math.imul(h, 31) + unitId.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function stableUnitFloat(unitId: string, salt: number): number {
  return (stableUnitInt(unitId, salt) % 1_000_003) / 1_000_003;
}

/**
 * Ring hold around an objective for computer-controlled defenders: spread out,
 * stay inside the capture radius, and avoid stacking on the checkpoint center.
 */
function computeAiDefenderHoldPosition(runtime: BattleRuntime, unit: RuntimeUnit): Vector2 | null {
  if (unit.side !== "defender" || unit.side === runtime.config.playerRole) {
    return null;
  }

  const objectives = [...runtime.objectives].sort((a, b) => a.id.localeCompare(b.id));
  if (objectives.length === 0) {
    return null;
  }

  const m = objectives.length;
  const objIndex = stableUnitInt(unit.id, 42_001) % m;
  const objective = objectives[objIndex];
  if (!objective) {
    return null;
  }

  const angle = stableUnitFloat(`${unit.id}@${objective.id}`, 17) * Math.PI * 2;
  const innerR = Math.max(3.2, objective.radius * 0.36);
  const outerR = Math.max(innerR + 1.4, objective.radius * 0.86);
  const radialT = stableUnitFloat(unit.id, 9001);
  const ringR = innerR + radialT * (outerR - innerR);

  return {
    x: objective.position.x + Math.cos(angle) * ringR,
    z: objective.position.z + Math.sin(angle) * ringR
  };
}

function getDoctrine(doctrineId: string) {
  const doctrine = GAME_CONTENT.doctrines[doctrineId];
  if (!doctrine) {
    throw new Error(`Doctrine not found: ${doctrineId}`);
  }
  return doctrine;
}

function nearestEnemy(units: RuntimeUnit[], source: RuntimeUnit): RuntimeUnit | null {
  let closest: RuntimeUnit | null = null;
  let closestDistance = Number.MAX_SAFE_INTEGER;
  for (const unit of units) {
    if (unit.side === source.side || unit.health <= 0) {
      continue;
    }
    const d = distance(unit.position, source.position);
    if (d < closestDistance) {
      closestDistance = d;
      closest = unit;
    }
  }
  return closest;
}

function getDoctrineSpacing(unit: RuntimeUnit): number {
  return getDoctrine(unit.doctrineId).spacing;
}

function applyOrderAutomation(runtime: BattleRuntime, unit: RuntimeUnit): void {
  if (unit.currentOrder === "defend-point") {
    const aiHold = computeAiDefenderHoldPosition(runtime, unit);
    if (aiHold) {
      unit.orderTarget = { ...aiHold };
    } else {
      const objective = nearestObjective(runtime, unit.position);
      unit.orderTarget = { ...objective.position };
    }
  }

  if (unit.currentOrder === "fallback") {
    unit.orderTarget = { ...unit.fallbackPoint };
  }
}

function moveUnit(runtime: BattleRuntime, unit: RuntimeUnit, deltaSeconds: number): void {
  if (unit.health <= 0) {
    unit.isRouted = true;
    return;
  }

  if (unit.currentOrder === "hold") {
    unit.stamina = clamp(unit.stamina + deltaSeconds * 2.6, 0, unit.maxStamina);
    return;
  }

  const doctrine = getDoctrine(unit.doctrineId);
  const speedFactor = unit.isRouted ? 1.18 : 1;
  const suppressionPenalty = clamp(1 - unit.suppression * 0.4, 0.55, 1);
  const staminaPenalty = clamp(unit.stamina / unit.maxStamina, 0.4, 1);
  const stepDistance = unit.speed * speedFactor * suppressionPenalty * staminaPenalty * deltaSeconds;
  const target = unit.orderTarget;

  unit.position = moveTowards(unit.position, target, stepDistance);
  const dir = normalize(unit.position, target);
  unit.facing = Math.atan2(dir.x, dir.z);
  unit.stamina = clamp(unit.stamina - deltaSeconds * 1.2, 0, unit.maxStamina);

  const spacing = getDoctrineSpacing(unit);
  const allies = runtime.units.filter((ally) => ally.side === unit.side && ally.id !== unit.id && !ally.isRouted);
  for (const ally of allies) {
    const d = distance(unit.position, ally.position);
    if (d < spacing && d > 0.01) {
      const pushDir = normalize(ally.position, unit.position);
      unit.position.x += pushDir.x * deltaSeconds * 1.8;
      unit.position.z += pushDir.z * deltaSeconds * 1.8;
    }
  }

  if (distance(unit.position, target) < 0.8 && (unit.currentOrder === "move" || unit.currentOrder === "attack-move")) {
    unit.currentOrder = "hold";
  }

  if (doctrine.formationMode === "tight") {
    unit.morale = clamp(unit.morale + deltaSeconds * 0.35, 0, unit.maxMorale);
  }
}

function applyCombat(runtime: BattleRuntime, unit: RuntimeUnit, deltaSeconds: number): void {
  if (unit.isRouted || unit.health <= 0) {
    return;
  }

  unit.cooldown = Math.max(0, unit.cooldown - deltaSeconds);
  unit.abilityCooldown = Math.max(0, unit.abilityCooldown - deltaSeconds);
  unit.suppression = clamp(
    unit.suppression - deltaSeconds * runtime.eraCombatTuning.suppressionRecoveryPerSecond,
    0,
    2
  );

  const target = unit.targetUnitId
    ? runtime.units.find((candidate) => candidate.id === unit.targetUnitId && !candidate.isRouted) ?? nearestEnemy(runtime.units, unit)
    : nearestEnemy(runtime.units, unit);

  if (!target) {
    return;
  }

  const d = distance(unit.position, target.position);
  if (d > unit.weapon.range && unit.currentOrder === "attack-move") {
    unit.orderTarget = { ...target.position };
    return;
  }

  if (d > unit.weapon.range || unit.cooldown > 0) {
    return;
  }

  const attackerDoctrine = getDoctrine(unit.doctrineId);
  const defenderDoctrine = getDoctrine(target.doctrineId);
  const baseAccuracy = unit.weapon.accuracy + attackerDoctrine.aggression * 0.1 - target.suppression * 0.05;
  const hitRoll = createRandom(runtime.tick + unit.id.length + target.id.length).float();
  if (hitRoll > baseAccuracy) {
    unit.cooldown = unit.weapon.reloadSeconds;
    return;
  }

  const flankDot = Math.cos(target.facing - Math.atan2(unit.position.x - target.position.x, unit.position.z - target.position.z));
  const flankBonus = flankDot < 0 ? 1.2 : 1;
  const coverZones = GAME_CONTENT.mapsByEra[runtime.config.selectedEra]
    .find((definition) => definition.id === runtime.config.mapId)
    ?.coverZones;
  let coverModifier = 1;
  if (coverZones) {
    for (const coverZone of coverZones) {
      if (distance(target.position, coverZone.center) <= coverZone.radius) {
        coverModifier = clamp(1 - coverZone.value * defenderDoctrine.coverBias, 0.55, 1);
        break;
      }
    }
  }

  const archetype = GAME_CONTENT.unitArchetypes[unit.archetypeId];
  const isMeleeStrike =
    unit.weapon.range <= MELEE_WEAPON_RANGE_CAP && d <= unit.weapon.range * 1.05;
  const shockChargeBonus = archetype?.role === "shock" && isMeleeStrike ? 1.08 : 1;
  const chargeMultiplier = isMeleeStrike ? attackerDoctrine.chargeImpact * shockChargeBonus : 1;
  const damage =
    unit.weapon.damage *
    flankBonus *
    coverModifier *
    chargeMultiplier *
    clamp(1 - target.armor * 0.4, 0.35, 1.1);
  target.health = clamp(target.health - damage, 0, target.maxHealth);
  target.suppression = clamp(target.suppression + unit.weapon.suppression, 0, 2.2);
  target.morale = clamp(
    target.morale - damage * 0.2 - unit.weapon.suppression * 4 - flankBonus * 0.4,
    0,
    target.maxMorale
  );

  unit.cooldown = unit.weapon.reloadSeconds;

  if (target.health <= 0) {
    target.isRouted = true;
    target.currentOrder = "fallback";
    target.orderTarget = { ...target.fallbackPoint };
  }
}

function applyMorale(runtime: BattleRuntime, unit: RuntimeUnit, deltaSeconds: number): void {
  if (unit.health <= 0) {
    unit.isRouted = true;
    return;
  }

  const doctrine = getDoctrine(unit.doctrineId);
  const healthRatio = unit.health / unit.maxHealth;
  const staminaRatio = unit.stamina / unit.maxStamina;
  const spacing = doctrine.spacing;
  const allies = runtime.units.filter(
    (ally) => ally.side === unit.side && ally.id !== unit.id && !ally.isRouted && ally.health > 0
  );
  let minAllyDistance = Number.POSITIVE_INFINITY;
  for (const ally of allies) {
    minAllyDistance = Math.min(minAllyDistance, distance(unit.position, ally.position));
  }
  const isolated = allies.length === 0 || minAllyDistance > spacing * 2.4;
  const cohesionStress =
    isolated && !unit.isRouted
      ? doctrine.cohesionDecay * (doctrine.formationMode === "tight" ? 2.4 : 0.85)
      : 0;
  const pressure =
    (1 - healthRatio) * 0.65 + (1 - staminaRatio) * 0.22 + unit.suppression * 0.08 + cohesionStress;
  unit.morale = clamp(unit.morale - pressure * deltaSeconds * 1.8, 0, unit.maxMorale);

  const routeThreshold = unit.maxMorale * doctrine.routingThreshold;
  if (!unit.isRouted && unit.morale <= routeThreshold) {
    unit.isRouted = true;
    unit.currentOrder = "fallback";
    unit.orderTarget = { ...unit.fallbackPoint };
  }

  if (unit.isRouted && unit.morale > unit.maxMorale * (doctrine.routingThreshold + 0.08)) {
    unit.isRouted = false;
    unit.currentOrder = "hold";
  }
}

function applyObjectives(runtime: BattleRuntime, deltaSeconds: number): void {
  for (const objective of runtime.objectives) {
    let attackerPresence = 0;
    let defenderPresence = 0;
    for (const unit of runtime.units) {
      if (unit.isRouted || unit.health <= 0) {
        continue;
      }
      if (distance(unit.position, objective.position) <= objective.radius) {
        if (unit.side === "attacker") {
          attackerPresence += 1;
        } else {
          defenderPresence += 1;
        }
      }
    }
    const delta =
      (attackerPresence - defenderPresence) *
      deltaSeconds *
      runtime.eraCombatTuning.objectivePresenceMultiplier;
    objective.progress = clamp(objective.progress + delta, -100, 100);

    if (objective.progress >= 100) {
      objective.controller = "attacker";
    } else if (objective.progress <= -100) {
      objective.controller = "defender";
    } else if (Math.abs(objective.progress) < 5) {
      objective.controller = null;
    }
  }
}

function applyAi(runtime: BattleRuntime): void {
  const enemySide = sideOpponent(runtime.config.playerRole);
  const enemyUnits = runtime.units.filter((unit) => unit.side === enemySide && !unit.isRouted && unit.health > 0);
  const playerUnits = runtime.units.filter(
    (unit) => unit.side === runtime.config.playerRole && !unit.isRouted && unit.health > 0
  );

  if (!runtime.playerHasOrdered) {
    for (const unit of enemyUnits) {
      unit.currentOrder = "hold";
      unit.orderTarget = { ...unit.position };
      unit.targetUnitId = undefined;
    }
    return;
  }

  for (const unit of enemyUnits) {
    const objective = nearestObjective(runtime, unit.position);
    const nearestPlayer = playerUnits
      .slice()
      .sort((a, b) => distance(a.position, unit.position) - distance(b.position, unit.position))[0];
    if (nearestPlayer && distance(nearestPlayer.position, unit.position) < unit.weapon.range * 0.9) {
      unit.currentOrder = "attack-move";
      unit.orderTarget = { ...nearestPlayer.position };
      unit.targetUnitId = nearestPlayer.id;
      continue;
    }

    if (enemySide === "attacker") {
      unit.currentOrder = "attack-move";
      unit.orderTarget = { ...objective.position };
      unit.targetUnitId = undefined;
    } else {
      const hold = computeAiDefenderHoldPosition(runtime, unit);
      unit.currentOrder = "defend-point";
      unit.orderTarget = hold ?? { ...objective.position };
      unit.targetUnitId = undefined;
    }
  }
}

function buildResult(runtime: BattleRuntime, winner: Side): MatchResult {
  const attackerUnits = runtime.units.filter((unit) => unit.side === "attacker");
  const defenderUnits = runtime.units.filter((unit) => unit.side === "defender");
  const attackerLosses = attackerUnits.filter((unit) => unit.health <= 0 || unit.isRouted).length;
  const defenderLosses = defenderUnits.filter((unit) => unit.health <= 0 || unit.isRouted).length;
  const objectivesHeld = {
    attacker: runtime.objectives.filter((objective) => objective.controller === "attacker").length,
    defender: runtime.objectives.filter((objective) => objective.controller === "defender").length
  };
  const losingSide = sideOpponent(winner);

  return {
    winner,
    routedFaction: getFactionIdBySide(runtime.config, losingSide),
    objectivesHeld,
    losses: {
      attacker: attackerLosses,
      defender: defenderLosses
    },
    durationSeconds: runtime.elapsedSeconds,
    seed: runtime.config.seed
  };
}

function evaluateVictory(runtime: BattleRuntime): void {
  if (runtime.winner) {
    return;
  }

  const attackerUnits = runtime.units.filter((unit) => unit.side === "attacker");
  const defenderUnits = runtime.units.filter((unit) => unit.side === "defender");
  const attackerRoutedRatio = attackerUnits.filter((unit) => unit.isRouted || unit.health <= 0).length / attackerUnits.length;
  const defenderRoutedRatio = defenderUnits.filter((unit) => unit.isRouted || unit.health <= 0).length / defenderUnits.length;

  if (attackerRoutedRatio >= 0.65) {
    runtime.winner = "defender";
  } else if (defenderRoutedRatio >= 0.65) {
    runtime.winner = "attacker";
  }

  const attackerObjectives = runtime.objectives.filter((objective) => objective.controller === "attacker").length;
  const defenderObjectives = runtime.objectives.filter((objective) => objective.controller === "defender").length;
  if (!runtime.winner && runtime.elapsedSeconds > 45) {
    if (attackerObjectives >= 2) {
      runtime.winner = "attacker";
    } else if (defenderObjectives >= 2) {
      runtime.winner = "defender";
    }
  }

  if (!runtime.winner && runtime.elapsedSeconds >= 300) {
    const attackerScore = attackerObjectives * 3 + attackerUnits.reduce((sum, unit) => sum + unit.morale, 0) / 100;
    const defenderScore = defenderObjectives * 3 + defenderUnits.reduce((sum, unit) => sum + unit.morale, 0) / 100;
    runtime.winner = attackerScore >= defenderScore ? "attacker" : "defender";
  }

  if (runtime.winner && !runtime.result) {
    runtime.result = buildResult(runtime, runtime.winner);
  }
}

function createRuntime(config: BattleConfig): BattleRuntime {
  return {
    config,
    eraCombatTuning: getEraCombatTuning(config.selectedEra),
    units: createInitialUnits(config),
    objectives: createInitialObjectives(config),
    elapsedSeconds: 0,
    tick: 0,
    winner: null,
    lastAiUpdate: 0,
    result: null,
    playerHasOrdered: false
  };
}

/** Rebuild simulator runtime from a persisted snapshot (same config seed). */
function applySnapshotToRuntime(runtime: BattleRuntime, snapshot: BattleSnapshot): void {
  runtime.elapsedSeconds = snapshot.elapsedSeconds;
  runtime.tick = snapshot.tick;
  runtime.winner = snapshot.winner;

  const unitById = new Map(runtime.units.map((unit) => [unit.id, unit]));
  for (const snapUnit of snapshot.units) {
    const unit = unitById.get(snapUnit.id);
    if (!unit) {
      continue;
    }
    unit.position = { ...snapUnit.position };
    unit.facing = snapUnit.facing;
    unit.health = clamp(snapUnit.health, 0, unit.maxHealth);
    unit.morale = clamp(snapUnit.morale, 0, unit.maxMorale);
    unit.stamina = clamp(snapUnit.stamina, 0, unit.maxStamina);
    unit.suppression = snapUnit.suppression;
    unit.isRouted = snapUnit.isRouted;
    unit.currentOrder = snapUnit.currentOrder;
    unit.orderTarget = { ...snapUnit.position };
    unit.targetUnitId = undefined;
  }

  for (const snapObjective of snapshot.objectives) {
    const objective = runtime.objectives.find((candidate) => candidate.id === snapObjective.id);
    if (objective) {
      objective.controller = snapObjective.controller;
      objective.progress = snapObjective.progress;
    }
  }

  if (runtime.winner && !runtime.result) {
    runtime.result = buildResult(runtime, runtime.winner);
  }
  runtime.playerHasOrdered = true;
  runtime.lastAiUpdate = runtime.elapsedSeconds;
}

export interface CreateBattleSimulatorOptions {
  hydrateFromSnapshot?: BattleSnapshot;
}

export function createBattleSimulator(config: BattleConfig, options?: CreateBattleSimulatorOptions) {
  const runtime = createRuntime(config);
  if (options?.hydrateFromSnapshot) {
    applySnapshotToRuntime(runtime, options.hydrateFromSnapshot);
  }

  return {
    getConfig(): BattleConfig {
      return runtime.config;
    },
    issueOrder(command: OrderCommand): void {
      const unit = runtime.units.find((candidate) => candidate.id === command.unitId);
      if (!unit || unit.side !== runtime.config.playerRole) {
        return;
      }
      const ordersThatWakeEnemyAi =
        command.commandType === "move" ||
        command.commandType === "attack-move" ||
        command.commandType === "defend-point" ||
        command.commandType === "fallback";
      if (ordersThatWakeEnemyAi) {
        runtime.playerHasOrdered = true;
      }
      unit.currentOrder = command.commandType;
      if (command.targetPosition) {
        unit.orderTarget = { ...command.targetPosition };
      }
      if (command.targetUnitId) {
        unit.targetUnitId = command.targetUnitId;
      }
      if (command.commandType === "use-ability" && unit.abilityCooldown <= 0) {
        unit.morale = clamp(unit.morale + 8, 0, unit.maxMorale);
        unit.suppression = clamp(unit.suppression - 0.2, 0, 2);
        unit.abilityCooldown = 20;
      }
    },
    injectMassCasualties(side: Side, ratio: number): void {
      const affected = runtime.units.filter((unit) => unit.side === side);
      for (const unit of affected) {
        unit.health = clamp(unit.health * (1 - ratio), 0, unit.maxHealth);
        unit.morale = clamp(unit.morale * (1 - ratio * 1.2), 0, unit.maxMorale);
      }
    },
    forceControlPoint(side: Side): void {
      const objective = runtime.objectives[0];
      if (!objective) {
        return;
      }
      objective.controller = side;
      objective.progress = side === "attacker" ? 100 : -100;
    },
    /** Player may reposition; enemies frozen; no combat, morale, objectives, or AI. */
    prepareDefenderDeployment(): void {
      for (const unit of runtime.units) {
        if (unit.side === runtime.config.playerRole) {
          unit.currentOrder = "hold";
          unit.orderTarget = { ...unit.position };
          unit.targetUnitId = undefined;
        }
      }
    },
    stepPlayerDeployment(seconds: number): void {
      const fixedStep = 0.25;
      let remaining = seconds;
      while (remaining > 0) {
        const delta = Math.min(fixedStep, remaining);
        remaining -= delta;

        for (const unit of runtime.units) {
          if (unit.side !== runtime.config.playerRole || unit.health <= 0) {
            continue;
          }
          moveUnit(runtime, unit, delta);
        }
        runtime.elapsedSeconds += delta;
        runtime.tick += 1;
      }
    },
    step(seconds: number): void {
      const fixedStep = 0.25;
      let remaining = seconds;
      while (remaining > 0) {
        const delta = Math.min(fixedStep, remaining);
        remaining -= delta;

        if (runtime.winner) {
          runtime.elapsedSeconds += delta;
          runtime.tick += 1;
          continue;
        }

        if (runtime.elapsedSeconds - runtime.lastAiUpdate >= 1) {
          applyAi(runtime);
          runtime.lastAiUpdate = runtime.elapsedSeconds;
        }

        for (const unit of runtime.units) {
          applyOrderAutomation(runtime, unit);
          moveUnit(runtime, unit, delta);
        }
        for (const unit of runtime.units) {
          applyCombat(runtime, unit, delta);
        }
        for (const unit of runtime.units) {
          applyMorale(runtime, unit, delta);
        }
        applyObjectives(runtime, delta);
        runtime.elapsedSeconds += delta;
        runtime.tick += 1;
        evaluateVictory(runtime);
      }
    },
    getSnapshot(): BattleSnapshot {
      const telemetry = {
        averageFriendlySpacing: computeSpacing(runtime.units, runtime.config.playerRole)
      };
      return {
        tick: runtime.tick,
        elapsedSeconds: runtime.elapsedSeconds,
        winner: runtime.winner,
        units: runtime.units.map((unit) => ({
          id: unit.id,
          archetypeId: unit.archetypeId,
          label: unit.label,
          side: unit.side,
          factionId: unit.factionId,
          position: { ...unit.position },
          facing: unit.facing,
          health: unit.health,
          morale: unit.morale,
          stamina: unit.stamina,
          suppression: unit.suppression,
          isRouted: unit.isRouted,
          currentOrder: unit.currentOrder
        })),
        objectives: runtime.objectives.map((objective) => ({ ...objective })),
        telemetry
      };
    },
    getResult(): MatchResult | null {
      return runtime.result ? { ...runtime.result } : null;
    }
  };
}
