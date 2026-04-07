import { describe, expect, it } from "vitest";
import { createRandomBattleConfig } from "@/app/createBattleConfig";
import { ERA_IDS, MAP_TYPES } from "@/content/catalog";

describe("createRandomBattleConfig", () => {
  it("always returns a legal setup", () => {
    for (const eraId of ERA_IDS) {
      for (const mapType of MAP_TYPES) {
        const config = createRandomBattleConfig({
          eraId,
          mapType,
          seed: 42,
          playerFactionIndex: 0
        });

        expect(config.mapType).toBe(mapType);
        expect(config.selectedEra).toBe(eraId);
        expect(config.playerRole === "attacker" || config.playerRole === "defender").toBe(
          true
        );
        expect(config.playerFactionId).not.toBe(config.enemyFactionId);
        expect(config.unitCap).toBeGreaterThanOrEqual(8);
        expect(config.unitCap).toBeLessThanOrEqual(12);
      }
    }
  });

  it("is deterministic with the same seed and inputs", () => {
    const a = createRandomBattleConfig({
      eraId: "ayyubid",
      mapType: "field",
      seed: 1337,
      playerFactionIndex: 1
    });
    const b = createRandomBattleConfig({
      eraId: "ayyubid",
      mapType: "field",
      seed: 1337,
      playerFactionIndex: 1
    });
    expect(a).toEqual(b);
  });
});
