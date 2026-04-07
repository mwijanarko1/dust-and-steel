import { describe, expect, it } from "vitest";
import { ERA_COMBAT_TUNING, getEraCombatTuning } from "@/simulation/eraRules";
import type { EraId } from "@/shared/types";

describe("era combat tuning", () => {
  it("defines tuning for every era", () => {
    const eras: EraId[] = ["ayyubid", "civil_war", "modern"];
    for (const eraId of eras) {
      const tuning = getEraCombatTuning(eraId);
      expect(tuning.suppressionRecoveryPerSecond).toBeGreaterThan(0);
      expect(tuning.objectivePresenceMultiplier).toBeGreaterThan(0);
      expect(tuning).toEqual(ERA_COMBAT_TUNING[eraId]);
    }
  });

  it("orders objective pressure: ancient fastest, modern slowest", () => {
    expect(ERA_COMBAT_TUNING.ayyubid.objectivePresenceMultiplier).toBeGreaterThan(
      ERA_COMBAT_TUNING.civil_war.objectivePresenceMultiplier
    );
    expect(ERA_COMBAT_TUNING.civil_war.objectivePresenceMultiplier).toBeGreaterThan(
      ERA_COMBAT_TUNING.modern.objectivePresenceMultiplier
    );
  });
});
