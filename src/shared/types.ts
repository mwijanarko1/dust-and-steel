export type EraId = "ayyubid" | "civil_war" | "modern";
export type MapType = "field" | "siegeLite";
export type Side = "attacker" | "defender";
export type FormationMode = "tight" | "loose";

export type OrderType =
  | "move"
  | "attack-move"
  | "hold"
  | "defend-point"
  | "fallback"
  | "face-direction"
  | "use-ability";

export interface Vector2 {
  x: number;
  z: number;
}

export interface WeaponProfile {
  id: string;
  name: string;
  range: number;
  damage: number;
  reloadSeconds: number;
  suppression: number;
  armorPierce: number;
  accuracy: number;
}

export interface DoctrineProfile {
  id: string;
  label: string;
  formationMode: FormationMode;
  spacing: number;
  cohesionDecay: number;
  coverBias: number;
  routingThreshold: number;
  chargeImpact: number;
  aggression: number;
}

export interface UnitArchetype {
  id: string;
  factionId: string;
  eraId: EraId;
  label: string;
  role: "line" | "ranged" | "shock" | "support" | "armor";
  size: number;
  speed: number;
  armor: number;
  maxHealth: number;
  maxMorale: number;
  maxStamina: number;
  ability: string;
  weapon: WeaponProfile;
  doctrineId: string;
}

export interface FactionDefinition {
  id: string;
  eraId: EraId;
  label: string;
  palette: {
    primary: string;
    secondary: string;
  };
  roster: string[];
  doctrineOverrideId?: string;
}

export interface EraDefinition {
  id: EraId;
  label: string;
  factionIds: [string, string];
  doctrineDefaults: {
    attacker: string;
    defender: string;
  };
  visualTheme: string;
  audioTheme: string;
}

export interface ObjectiveTemplate {
  id: string;
  label: string;
  position: Vector2;
  radius: number;
  weight: number;
}

export interface DeploymentZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CoverZone {
  id: string;
  center: Vector2;
  radius: number;
  value: number;
}

/** Decorative + readable terrain props; positions align with cover where possible. */
export type ObstacleVisualKind =
  | "low_wall_limestone"
  | "tree_cluster_scrub"
  | "rubble_pile"
  | "split_rail_fence"
  | "berm_earthwork"
  | "timber_crates"
  | "jersey_barrier"
  | "sandbag_line"
  | "burned_vehicle"
  | "hesco_bastion"
  | "concrete_spill"
  | "backdrop_castle"
  | "backdrop_jungle"
  | "river_shallow"
  | "rock_cluster"
  | "backdrop_urban_ruins";

export interface ObstacleVisual {
  id: string;
  kind: ObstacleVisualKind;
  center: Vector2;
  width: number;
  depth: number;
  rotationY: number;
}

export interface MapDefinition {
  id: string;
  eraId: EraId;
  type: MapType;
  label: string;
  size: {
    width: number;
    depth: number;
  };
  objectiveTemplates: ObjectiveTemplate[];
  deploymentZones: {
    attacker: DeploymentZone;
    defender: DeploymentZone;
  };
  terrainTags: string[];
  coverZones: CoverZone[];
  obstacleVisuals: ObstacleVisual[];
}

export interface BattleConfig {
  selectedEra: EraId;
  playerFactionId: string;
  enemyFactionId: string;
  mapId: string;
  mapType: MapType;
  seed: number;
  playerRole: Side;
  unitCap: number;
}

export interface OrderCommand {
  unitId: string;
  commandType: OrderType;
  targetPosition?: Vector2;
  targetUnitId?: string;
  queuedAtTick?: number;
}

export interface UnitSnapshot {
  id: string;
  archetypeId: string;
  label: string;
  side: Side;
  factionId: string;
  position: Vector2;
  facing: number;
  health: number;
  morale: number;
  stamina: number;
  suppression: number;
  isRouted: boolean;
  currentOrder: OrderType;
}

export interface ObjectiveSnapshot {
  id: string;
  label: string;
  position: Vector2;
  radius: number;
  controller: Side | null;
  progress: number;
}

export type BattleFlowState =
  | { phase: "attacker_briefing" }
  | { phase: "defender_deployment"; secondsRemaining: number }
  | { phase: "combat" };

export interface BattleSnapshot {
  tick: number;
  elapsedSeconds: number;
  winner: Side | null;
  units: UnitSnapshot[];
  objectives: ObjectiveSnapshot[];
  telemetry: {
    averageFriendlySpacing: number;
  };
}

export interface MatchResult {
  winner: Side;
  routedFaction: string;
  objectivesHeld: {
    attacker: number;
    defender: number;
  };
  losses: {
    attacker: number;
    defender: number;
  };
  durationSeconds: number;
  seed: number;
}

export interface ContentCatalog {
  eras: Record<EraId, EraDefinition>;
  factions: Record<string, FactionDefinition>;
  unitArchetypes: Record<string, UnitArchetype>;
  doctrines: Record<string, DoctrineProfile>;
  mapsByEra: Record<EraId, MapDefinition[]>;
}
