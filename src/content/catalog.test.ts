import { describe, expect, it } from "vitest";
import { ERA_IDS, GAME_CONTENT, MAP_TYPES } from "@/content/catalog";

describe("content catalog", () => {
  it("ships all required eras", () => {
    expect(ERA_IDS).toEqual(["ayyubid", "civil_war", "modern"]);
  });

  it("contains exactly two factions per era with 6-8 unit archetypes each", () => {
    for (const eraId of ERA_IDS) {
      const era = GAME_CONTENT.eras[eraId];
      expect(era.factionIds).toHaveLength(2);

      for (const factionId of era.factionIds) {
        const faction = GAME_CONTENT.factions[factionId];
        expect(faction).toBeDefined();
        if (!faction) {
          throw new Error(`Missing faction ${factionId}`);
        }
        expect(faction.eraId).toBe(eraId);
        expect(faction.roster.length).toBeGreaterThanOrEqual(6);
        expect(faction.roster.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it("contains field and siege-lite maps for every era", () => {
    for (const eraId of ERA_IDS) {
      const maps = GAME_CONTENT.mapsByEra[eraId];
      expect(maps.length).toBeGreaterThanOrEqual(2);
      const mapTypes = new Set(maps.map((mapDefinition) => mapDefinition.type));
      for (const mapType of MAP_TYPES) {
        expect(mapTypes.has(mapType)).toBe(true);
      }
    }
  });

  it("gives each map era-themed obstacles aligned with cover", () => {
    for (const eraId of ERA_IDS) {
      for (const map of GAME_CONTENT.mapsByEra[eraId]) {
        expect(map.obstacleVisuals.length).toBeGreaterThanOrEqual(3);
        expect(map.coverZones.length).toBeGreaterThanOrEqual(2);
        const ids = new Set(map.obstacleVisuals.map((o) => o.id));
        expect(ids.size).toBe(map.obstacleVisuals.length);
      }
    }
    const ayyubidKinds = new Set(
      GAME_CONTENT.mapsByEra.ayyubid.flatMap((m) => m.obstacleVisuals.map((o) => o.kind))
    );
    const civilKinds = new Set(
      GAME_CONTENT.mapsByEra.civil_war.flatMap((m) => m.obstacleVisuals.map((o) => o.kind))
    );
    const modernKinds = new Set(
      GAME_CONTENT.mapsByEra.modern.flatMap((m) => m.obstacleVisuals.map((o) => o.kind))
    );
    expect(ayyubidKinds.has("tree_cluster_scrub") || ayyubidKinds.has("low_wall_limestone")).toBe(true);
    expect(civilKinds.has("split_rail_fence") || civilKinds.has("berm_earthwork")).toBe(true);
    expect(modernKinds.has("jersey_barrier") || modernKinds.has("hesco_bastion")).toBe(true);
    expect(ayyubidKinds.has("jersey_barrier")).toBe(false);
    expect(modernKinds.has("tree_cluster_scrub")).toBe(false);
  });
});
