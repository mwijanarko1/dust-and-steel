import type {
  ContentCatalog,
  DoctrineProfile,
  EraDefinition,
  EraId,
  FactionDefinition,
  MapDefinition,
  MapType,
  ObstacleVisual,
  UnitArchetype,
  WeaponProfile
} from "@/shared/types";

export const ERA_IDS: EraId[] = ["ayyubid", "civil_war", "modern"];
export const MAP_TYPES: MapType[] = ["field", "siegeLite"];

const doctrines: Record<string, DoctrineProfile> = {
  ancient_assault: {
    id: "ancient_assault",
    label: "Ancient Assault",
    formationMode: "tight",
    spacing: 2.1,
    cohesionDecay: 0.2,
    coverBias: 0.1,
    routingThreshold: 0.34,
    chargeImpact: 1.25,
    aggression: 0.8
  },
  ancient_defense: {
    id: "ancient_defense",
    label: "Ancient Defense",
    formationMode: "tight",
    spacing: 1.9,
    cohesionDecay: 0.15,
    coverBias: 0.2,
    routingThreshold: 0.3,
    chargeImpact: 1.15,
    aggression: 0.6
  },
  gunpowder_assault: {
    id: "gunpowder_assault",
    label: "Gunpowder Assault",
    formationMode: "loose",
    spacing: 3.3,
    cohesionDecay: 0.1,
    coverBias: 0.35,
    routingThreshold: 0.4,
    chargeImpact: 0.7,
    aggression: 0.75
  },
  gunpowder_defense: {
    id: "gunpowder_defense",
    label: "Gunpowder Defense",
    formationMode: "loose",
    spacing: 3,
    cohesionDecay: 0.08,
    coverBias: 0.45,
    routingThreshold: 0.36,
    chargeImpact: 0.6,
    aggression: 0.55
  },
  modern_assault: {
    id: "modern_assault",
    label: "Modern Assault",
    formationMode: "loose",
    spacing: 4.4,
    cohesionDecay: 0.06,
    coverBias: 0.55,
    routingThreshold: 0.45,
    chargeImpact: 0.45,
    aggression: 0.7
  },
  modern_defense: {
    id: "modern_defense",
    label: "Modern Defense",
    formationMode: "loose",
    spacing: 4.1,
    cohesionDecay: 0.05,
    coverBias: 0.65,
    routingThreshold: 0.42,
    chargeImpact: 0.4,
    aggression: 0.5
  }
};

const eras: Record<EraId, EraDefinition> = {
  ayyubid: {
    id: "ayyubid",
    label: "Crusades",
    factionIds: ["ayyubid_sultanate", "crusader_states"],
    doctrineDefaults: { attacker: "ancient_assault", defender: "ancient_defense" },
    visualTheme: "sunlit limestone",
    audioTheme: "oud_and_horns"
  },
  civil_war: {
    id: "civil_war",
    label: "American Civil War",
    factionIds: ["union_army", "confederate_army"],
    doctrineDefaults: { attacker: "gunpowder_assault", defender: "gunpowder_defense" },
    visualTheme: "rail and smoke",
    audioTheme: "fife_and_drum"
  },
  modern: {
    id: "modern",
    label: "Modern Conflict",
    factionIds: ["coalition_task_force", "insurgent_front"],
    doctrineDefaults: { attacker: "modern_assault", defender: "modern_defense" },
    visualTheme: "dusted concrete",
    audioTheme: "pulse_and_static"
  }
};

interface FactionTemplate {
  id: string;
  eraId: EraId;
  label: string;
  palette: {
    primary: string;
    secondary: string;
  };
  doctrineOverrideId?: string;
  style: "ancient" | "civil_war" | "modern";
}

function createWeapon(weapon: Partial<WeaponProfile> & Pick<WeaponProfile, "id" | "name">): WeaponProfile {
  return {
    range: 12,
    damage: 8,
    reloadSeconds: 2.2,
    suppression: 0.08,
    armorPierce: 0.1,
    accuracy: 0.68,
    ...weapon
  };
}

function createAncientWeapons(factionId: string): WeaponProfile[] {
  return [
    createWeapon({
      id: `${factionId}_spear`,
      name: "Spear Wall",
      range: 2.2,
      damage: 10,
      reloadSeconds: 1.4,
      suppression: 0.04,
      armorPierce: 0.24,
      accuracy: 0.84
    }),
    createWeapon({
      id: `${factionId}_sword`,
      name: "Gladius / Blade",
      range: 1.8,
      damage: 11,
      reloadSeconds: 1.25,
      suppression: 0.03,
      armorPierce: 0.18,
      accuracy: 0.86
    }),
    createWeapon({
      id: `${factionId}_bow`,
      name: "Composite Bow",
      range: 26,
      damage: 7,
      reloadSeconds: 2.5,
      suppression: 0.11,
      armorPierce: 0.08,
      accuracy: 0.62
    }),
    createWeapon({
      id: `${factionId}_javelin`,
      name: "Javelin Volley",
      range: 18,
      damage: 9,
      reloadSeconds: 2.8,
      suppression: 0.12,
      armorPierce: 0.12,
      accuracy: 0.58
    }),
    createWeapon({
      id: `${factionId}_charge`,
      name: "Lance Charge",
      range: 2.8,
      damage: 13,
      reloadSeconds: 1.7,
      suppression: 0.08,
      armorPierce: 0.25,
      accuracy: 0.8
    }),
    createWeapon({
      id: `${factionId}_guard`,
      name: "Guard Pikes",
      range: 2.4,
      damage: 12,
      reloadSeconds: 1.5,
      suppression: 0.05,
      armorPierce: 0.22,
      accuracy: 0.83
    })
  ];
}

function createCivilWarWeapons(factionId: string): WeaponProfile[] {
  return [
    createWeapon({
      id: `${factionId}_rifle`,
      name: "Rifled Musket",
      range: 42,
      damage: 7,
      reloadSeconds: 1.7,
      suppression: 0.15,
      armorPierce: 0.2,
      accuracy: 0.66
    }),
    createWeapon({
      id: `${factionId}_smg`,
      name: "Repeating Carbine",
      range: 24,
      damage: 8,
      reloadSeconds: 1.4,
      suppression: 0.11,
      armorPierce: 0.12,
      accuracy: 0.74
    }),
    createWeapon({
      id: `${factionId}_mg`,
      name: "Gatling Burst",
      range: 50,
      damage: 6,
      reloadSeconds: 1.2,
      suppression: 0.25,
      armorPierce: 0.16,
      accuracy: 0.63
    }),
    createWeapon({
      id: `${factionId}_at`,
      name: "Field Artillery",
      range: 34,
      damage: 18,
      reloadSeconds: 4.2,
      suppression: 0.2,
      armorPierce: 0.58,
      accuracy: 0.52
    }),
    createWeapon({
      id: `${factionId}_marksman`,
      name: "Sharpshooter",
      range: 58,
      damage: 10,
      reloadSeconds: 2.5,
      suppression: 0.18,
      armorPierce: 0.24,
      accuracy: 0.8
    }),
    createWeapon({
      id: `${factionId}_engineer`,
      name: "Cavalry Carbine",
      range: 30,
      damage: 7,
      reloadSeconds: 1.9,
      suppression: 0.09,
      armorPierce: 0.13,
      accuracy: 0.64
    })
  ];
}

function createModernWeapons(factionId: string): WeaponProfile[] {
  return [
    createWeapon({
      id: `${factionId}_rifle`,
      name: "Assault Rifle",
      range: 48,
      damage: 8,
      reloadSeconds: 1.5,
      suppression: 0.17,
      armorPierce: 0.24,
      accuracy: 0.71
    }),
    createWeapon({
      id: `${factionId}_dmr`,
      name: "DMR",
      range: 64,
      damage: 11,
      reloadSeconds: 2.3,
      suppression: 0.2,
      armorPierce: 0.31,
      accuracy: 0.79
    }),
    createWeapon({
      id: `${factionId}_lmg`,
      name: "LMG",
      range: 56,
      damage: 7,
      reloadSeconds: 1.1,
      suppression: 0.28,
      armorPierce: 0.21,
      accuracy: 0.65
    }),
    createWeapon({
      id: `${factionId}_atgm`,
      name: "ATGM",
      range: 46,
      damage: 21,
      reloadSeconds: 4.8,
      suppression: 0.27,
      armorPierce: 0.72,
      accuracy: 0.56
    }),
    createWeapon({
      id: `${factionId}_drone`,
      name: "Drone Marking",
      range: 52,
      damage: 6,
      reloadSeconds: 2.8,
      suppression: 0.16,
      armorPierce: 0.12,
      accuracy: 0.86
    }),
    createWeapon({
      id: `${factionId}_shotgun`,
      name: "Breach Shotgun",
      range: 16,
      damage: 13,
      reloadSeconds: 1.6,
      suppression: 0.14,
      armorPierce: 0.18,
      accuracy: 0.77
    })
  ];
}

function createFactionUnits(template: FactionTemplate): {
  faction: FactionDefinition;
  units: Record<string, UnitArchetype>;
} {
  const weapons =
    template.style === "ancient"
      ? createAncientWeapons(template.id)
      : template.style === "civil_war"
        ? createCivilWarWeapons(template.id)
        : createModernWeapons(template.id);

  const roleTemplates = [
    { role: "line", label: "Line Guard", speed: 8.5, armor: 0.48, ability: "brace" },
    { role: "line", label: "Vanguard", speed: 9.1, armor: 0.42, ability: "push" },
    { role: "ranged", label: "Ranged Wing", speed: 9.7, armor: 0.28, ability: "focused_fire" },
    { role: "shock", label: "Shock Unit", speed: 10.8, armor: 0.35, ability: "shock_charge" },
    { role: "support", label: "Support Cell", speed: 9.3, armor: 0.32, ability: "stabilize" },
    { role: "armor", label: "Heavy Wing", speed: 7.4, armor: 0.62, ability: "suppress" }
  ] as const;

  const doctrineId =
    template.doctrineOverrideId ??
    (template.style === "ancient"
      ? "ancient_assault"
      : template.style === "civil_war"
        ? "gunpowder_assault"
        : "modern_assault");

  const units: Record<string, UnitArchetype> = {};
  const roster: string[] = [];
  const defaultWeapon = weapons[0];
  if (!defaultWeapon) {
    throw new Error(`No weapon template found for faction ${template.id}`);
  }

  roleTemplates.forEach((roleTemplate, index) => {
    const weapon = weapons[index] ?? defaultWeapon;
    const id = `${template.id}_unit_${index + 1}`;
    units[id] = {
      id,
      factionId: template.id,
      eraId: template.eraId,
      label: `${template.label} ${roleTemplate.label}`,
      role: roleTemplate.role,
      size: template.style === "ancient" ? 110 : template.style === "civil_war" ? 62 : 48,
      speed: roleTemplate.speed + (template.style === "modern" ? 0.7 : 0),
      armor: roleTemplate.armor,
      maxHealth: template.style === "modern" ? 108 : 120,
      maxMorale: template.style === "modern" ? 102 : 110,
      maxStamina: template.style === "modern" ? 112 : 100,
      ability: roleTemplate.ability,
      weapon,
      doctrineId
    };
    roster.push(id);
  });

  return {
    faction: {
      id: template.id,
      eraId: template.eraId,
      label: template.label,
      palette: template.palette,
      roster,
      doctrineOverrideId: template.doctrineOverrideId
    },
    units
  };
}

const factionTemplates: FactionTemplate[] = [
  {
    id: "ayyubid_sultanate",
    eraId: "ayyubid",
    label: "Ayyubid Sultanate",
    palette: { primary: "#1f5e47", secondary: "#d8b370" },
    style: "ancient"
  },
  {
    id: "crusader_states",
    eraId: "ayyubid",
    label: "Crusader States",
    palette: { primary: "#a98b4c", secondary: "#f2e6cc" },
    style: "ancient"
  },
  {
    id: "union_army",
    eraId: "civil_war",
    label: "Union Army",
    palette: { primary: "#284a7a", secondary: "#c9c4b8" },
    style: "civil_war"
  },
  {
    id: "confederate_army",
    eraId: "civil_war",
    label: "Confederate Army",
    palette: { primary: "#5c5346", secondary: "#a89878" },
    style: "civil_war"
  },
  {
    id: "coalition_task_force",
    eraId: "modern",
    label: "Coalition Task Force",
    palette: { primary: "#35506a", secondary: "#7fb0cb" },
    style: "modern"
  },
  {
    id: "insurgent_front",
    eraId: "modern",
    label: "Insurgent Front",
    palette: { primary: "#8d5f2d", secondary: "#d8b67c" },
    style: "modern"
  }
];

const factions: Record<string, FactionDefinition> = {};
const unitArchetypes: Record<string, UnitArchetype> = {};
for (const template of factionTemplates) {
  const built = createFactionUnits(template);
  factions[built.faction.id] = built.faction;
  Object.assign(unitArchetypes, built.units);
}

interface EraTerrainSlice {
  terrainTags: string[];
  coverZones: MapDefinition["coverZones"];
  obstacleVisuals: ObstacleVisual[];
}

function eraTerrain(eraId: EraId, type: MapType): EraTerrainSlice {
  const isSiege = type === "siegeLite";
  if (eraId === "ayyubid") {
    return isSiege
      ? {
          terrainTags: ["castle-breach", "curtain-line", "tower-flanks", "ward-field"],
          coverZones: [
            { id: "curtain_shelter", center: { x: 0, z: 8 }, radius: 26, value: 0.38 },
            { id: "tower_base", center: { x: -28, z: 18 }, radius: 12, value: 0.42 },
            { id: "breach_mound", center: { x: 20, z: -6 }, radius: 11, value: 0.3 }
          ],
          obstacleVisuals: [
            {
              id: "castle_keep_backdrop",
              kind: "backdrop_castle",
              center: { x: 0, z: 64 },
              width: 112,
              depth: 18,
              rotationY: 0
            },
            {
              id: "curtain_segment",
              kind: "low_wall_limestone",
              center: { x: 0, z: 6 },
              width: 46,
              depth: 3.4,
              rotationY: 0
            },
            {
              id: "gate_breach",
              kind: "rubble_pile",
              center: { x: 18, z: -6 },
              width: 15,
              depth: 11,
              rotationY: -0.35
            },
            {
              id: "inner_battlement",
              kind: "low_wall_limestone",
              center: { x: -10, z: 34 },
              width: 30,
              depth: 2.8,
              rotationY: 0.22
            }
          ]
        }
      : {
          terrainTags: ["castle-ward", "open-battle-plain", "limestone-scatter"],
          coverZones: [
            { id: "castle_shadow", center: { x: 0, z: 52 }, radius: 22, value: 0.32 },
            { id: "midfield_rubble", center: { x: -8, z: 2 }, radius: 18, value: 0.24 },
            { id: "ward_ridge", center: { x: 22, z: -6 }, radius: 12, value: 0.22 }
          ],
          obstacleVisuals: [
            {
              id: "castle_backdrop",
              kind: "backdrop_castle",
              center: { x: 0, z: 68 },
              width: 120,
              depth: 16,
              rotationY: 0
            },
            {
              id: "ridge_wall",
              kind: "low_wall_limestone",
              center: { x: 18, z: -6 },
              width: 32,
              depth: 3,
              rotationY: 0.35
            },
            {
              id: "trampled_rubble_a",
              kind: "rubble_pile",
              center: { x: -12, z: 8 },
              width: 14,
              depth: 11,
              rotationY: 0.5
            },
            {
              id: "trampled_rubble_b",
              kind: "rubble_pile",
              center: { x: 28, z: 14 },
              width: 11,
              depth: 9,
              rotationY: -0.2
            }
          ]
        };
  }
  if (eraId === "civil_war") {
    return isSiege
      ? {
          terrainTags: ["jungle-horizon", "earthwork-line", "river-flank", "rocky-clearing"],
          coverZones: [
            { id: "earthwork_face", center: { x: -4, z: 8 }, radius: 28, value: 0.42 },
            { id: "river_bank", center: { x: -32, z: 2 }, radius: 14, value: 0.34 },
            { id: "boulder_pile", center: { x: 22, z: -8 }, radius: 11, value: 0.3 }
          ],
          obstacleVisuals: [
            {
              id: "jungle_mass",
              kind: "backdrop_jungle",
              center: { x: 0, z: 66 },
              width: 128,
              depth: 24,
              rotationY: 0
            },
            {
              id: "main_berm",
              kind: "berm_earthwork",
              center: { x: -2, z: 6 },
              width: 50,
              depth: 8,
              rotationY: 0.05
            },
            {
              id: "flank_river",
              kind: "river_shallow",
              center: { x: -36, z: 4 },
              width: 28,
              depth: 70,
              rotationY: 0.08
            },
            {
              id: "siege_rocks",
              kind: "rock_cluster",
              center: { x: 24, z: -10 },
              width: 16,
              depth: 14,
              rotationY: 0.15
            },
            {
              id: "parapet_fence",
              kind: "split_rail_fence",
              center: { x: -20, z: 20 },
              width: 20,
              depth: 3,
              rotationY: 1.05
            }
          ]
        }
      : {
          terrainTags: ["jungle-edge", "river-cut", "clearing", "granite-outcrops"],
          coverZones: [
            { id: "jungle_shade", center: { x: 0, z: 58 }, radius: 20, value: 0.3 },
            { id: "river_ford", center: { x: -6, z: 6 }, radius: 16, value: 0.28 },
            { id: "rock_cluster_cv", center: { x: 24, z: -12 }, radius: 12, value: 0.26 }
          ],
          obstacleVisuals: [
            {
              id: "jungle_backdrop",
              kind: "backdrop_jungle",
              center: { x: 0, z: 70 },
              width: 132,
              depth: 26,
              rotationY: 0
            },
            {
              id: "main_creek",
              kind: "river_shallow",
              center: { x: -6, z: 4 },
              width: 92,
              depth: 8,
              rotationY: 0.14
            },
            {
              id: "side_brook",
              kind: "river_shallow",
              center: { x: 34, z: -22 },
              width: 36,
              depth: 7,
              rotationY: -0.55
            },
            {
              id: "granite_stack",
              kind: "rock_cluster",
              center: { x: -24, z: -10 },
              width: 18,
              depth: 15,
              rotationY: -0.3
            },
            {
              id: "clearing_fence",
              kind: "split_rail_fence",
              center: { x: 26, z: 38 },
              width: 26,
              depth: 4,
              rotationY: 0.4
            }
          ]
        };
  }
  /* modern — ruined city */
  return isSiege
    ? {
        terrainTags: ["razed-skyline", "hesco-slot", "rubble-stacks", "fatal-alleys"],
        coverZones: [
          { id: "hesco_line", center: { x: 2, z: 6 }, radius: 30, value: 0.48 },
          { id: "ruin_corner", center: { x: -26, z: 14 }, radius: 12, value: 0.44 },
          { id: "barrier_slot", center: { x: 22, z: -4 }, radius: 11, value: 0.38 }
        ],
        obstacleVisuals: [
          {
            id: "city_ruins_backdrop",
            kind: "backdrop_urban_ruins",
            center: { x: 0, z: 64 },
            width: 118,
            depth: 22,
            rotationY: 0
          },
          {
            id: "outer_hesco",
            kind: "hesco_bastion",
            center: { x: 0, z: 5 },
            width: 36,
            depth: 14,
            rotationY: 0
          },
          {
            id: "concrete_ruin",
            kind: "concrete_spill",
            center: { x: -26, z: 14 },
            width: 14,
            depth: 12,
            rotationY: 0.55
          },
          {
            id: "checkpoint_barriers",
            kind: "jersey_barrier",
            center: { x: 22, z: -4 },
            width: 18,
            depth: 3,
            rotationY: -0.35
          },
          {
            id: "inner_sandbags",
            kind: "sandbag_line",
            center: { x: -10, z: 28 },
            width: 20,
            depth: 3,
            rotationY: 0.15
          }
        ]
      }
    : {
        terrainTags: ["collapsed-blocks", "burned-avenue", "rubble-fields", "overwatch-lanes"],
        coverZones: [
          { id: "ruin_wedge", center: { x: -18, z: 12 }, radius: 14, value: 0.38 },
          { id: "wreck_hull", center: { x: 28, z: 8 }, radius: 12, value: 0.42 },
          { id: "rubble_heap", center: { x: 6, z: -10 }, radius: 14, value: 0.34 }
        ],
        obstacleVisuals: [
          {
            id: "ruined_skyline",
            kind: "backdrop_urban_ruins",
            center: { x: 0, z: 68 },
            width: 122,
            depth: 22,
            rotationY: 0
          },
          {
            id: "street_rubble",
            kind: "rubble_pile",
            center: { x: -14, z: 6 },
            width: 16,
            depth: 12,
            rotationY: 0.4
          },
          {
            id: "road_barriers",
            kind: "jersey_barrier",
            center: { x: -18, z: 12 },
            width: 22,
            depth: 3.2,
            rotationY: 0.65
          },
          {
            id: "convoy_wreck",
            kind: "burned_vehicle",
            center: { x: 28, z: 8 },
            width: 14,
            depth: 8,
            rotationY: -0.85
          },
          {
            id: "slab_spill",
            kind: "concrete_spill",
            center: { x: 8, z: -12 },
            width: 20,
            depth: 11,
            rotationY: 0.95
          }
        ]
      };
}

function eraMapLabel(eraId: EraId, isSiege: boolean): string {
  const base = eras[eraId].label;
  if (eraId === "ayyubid") {
    return `${base} — ${isSiege ? "Breached wall" : "Before the castle"}`;
  }
  if (eraId === "civil_war") {
    return `${base} — ${isSiege ? "River redoubt" : "Jungle clearing"}`;
  }
  return `${base} — ${isSiege ? "Ruined compound" : "Ruined city"}`;
}

function createMap(eraId: EraId, type: MapType): MapDefinition {
  const isSiege = type === "siegeLite";
  const slice = eraTerrain(eraId, type);
  return {
    id: `${eraId}_${type}`,
    eraId,
    type,
    label: eraMapLabel(eraId, isSiege),
    size: {
      width: isSiege ? 170 : 190,
      depth: isSiege ? 130 : 150
    },
    objectiveTemplates: isSiege
      ? [
          { id: "gate", label: "Gate", position: { x: 0, z: -15 }, radius: 12, weight: 2 },
          { id: "inner", label: "Inner Keep", position: { x: 0, z: 28 }, radius: 14, weight: 3 },
          { id: "supply", label: "Supply Yard", position: { x: -34, z: 8 }, radius: 10, weight: 1 }
        ]
      : [
          { id: "ridge", label: "Ridge", position: { x: 0, z: -4 }, radius: 13, weight: 2 },
          { id: "crossroads", label: "Crossroads", position: { x: 31, z: 18 }, radius: 11, weight: 1 },
          { id: "grove", label: "Grove", position: { x: -30, z: 18 }, radius: 11, weight: 1 }
        ],
    deploymentZones: {
      attacker: { minX: -65, maxX: 65, minZ: -58, maxZ: -42 },
      defender: { minX: -65, maxX: 65, minZ: 42, maxZ: 58 }
    },
    terrainTags: slice.terrainTags,
    coverZones: slice.coverZones,
    obstacleVisuals: slice.obstacleVisuals
  };
}

const mapsByEra: Record<EraId, MapDefinition[]> = {
  ayyubid: [createMap("ayyubid", "field"), createMap("ayyubid", "siegeLite")],
  civil_war: [createMap("civil_war", "field"), createMap("civil_war", "siegeLite")],
  modern: [createMap("modern", "field"), createMap("modern", "siegeLite")]
};

export const GAME_CONTENT: ContentCatalog = {
  eras,
  factions,
  unitArchetypes,
  doctrines,
  mapsByEra
};
