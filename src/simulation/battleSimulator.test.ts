import { describe, expect, it } from "vitest";
import { createRandomBattleConfig } from "@/app/createBattleConfig";
import { GAME_CONTENT } from "@/content/catalog";
import { createBattleSimulator } from "@/simulation/battleSimulator";
import { serializeBattleSnapshot } from "@/shared/serialize";
import type { EraId, OrderType } from "@/shared/types";

function issueCommand(sim: ReturnType<typeof createBattleSimulator>, commandType: OrderType) {
  const controlledUnit = sim
    .getSnapshot()
    .units.find((unit) => unit.side === sim.getConfig().playerRole && !unit.isRouted);

  if (!controlledUnit) {
    return;
  }

  sim.issueOrder({
    commandType,
    unitId: controlledUnit.id,
    targetPosition: { x: 0, z: 0 }
  });
}

describe("battle simulator", () => {
  it("routes forces when morale collapses from losses and pressure", () => {
    const config = createRandomBattleConfig({
      eraId: "ayyubid",
      mapType: "field",
      seed: 9001,
      playerFactionIndex: 0
    });

    const sim = createBattleSimulator(config);
    sim.injectMassCasualties(config.playerRole, 0.9);
    sim.step(10);
    const snapshot = sim.getSnapshot();
    const routedCount = snapshot.units.filter(
      (unit) => unit.side === config.playerRole && unit.isRouted
    ).length;
    expect(routedCount).toBeGreaterThan(0);
  });

  it("captures objectives based on local control", () => {
    const config = createRandomBattleConfig({
      eraId: "ayyubid",
      mapType: "siegeLite",
      seed: 4242,
      playerFactionIndex: 0
    });
    const sim = createBattleSimulator(config);
    sim.forceControlPoint(config.playerRole);
    sim.step(20);

    const owned = sim
      .getSnapshot()
      .objectives.filter((objective) => objective.controller === config.playerRole);
    expect(owned.length).toBeGreaterThanOrEqual(1);
  });

  it("specifies tighter formation spacing for Crusades doctrines than for modern doctrines", () => {
    const ancientId = GAME_CONTENT.eras.ayyubid.doctrineDefaults.attacker;
    const modernId = GAME_CONTENT.eras.modern.doctrineDefaults.attacker;
    expect(GAME_CONTENT.doctrines[ancientId]!.spacing).toBeLessThan(
      GAME_CONTENT.doctrines[modernId]!.spacing
    );
  });

  it("is deterministic with fixed seed and command sequence", () => {
    const config = createRandomBattleConfig({
      eraId: "ayyubid",
      mapType: "field",
      seed: 2026,
      playerFactionIndex: 0
    });
    const runA = createBattleSimulator(config);
    const runB = createBattleSimulator(config);

    for (const commandType of ["move", "hold", "attack-move", "defend-point"] satisfies OrderType[]) {
      issueCommand(runA, commandType);
      issueCommand(runB, commandType);
    }

    runA.step(90);
    runB.step(90);

    expect(serializeBattleSnapshot(runA.getSnapshot())).toEqual(
      serializeBattleSnapshot(runB.getSnapshot())
    );
  });

  it("is deterministic for each era with identical inputs", () => {
    const eras: EraId[] = ["ayyubid", "civil_war", "modern"];
    for (const eraId of eras) {
      const config = createRandomBattleConfig({
        eraId,
        mapType: "field",
        seed: 55_017,
        playerFactionIndex: 1
      });
      const runA = createBattleSimulator(config);
      const runB = createBattleSimulator(config);
      issueCommand(runA, "hold");
      issueCommand(runB, "hold");
      runA.step(40);
      runB.step(40);
      expect(serializeBattleSnapshot(runA.getSnapshot())).toEqual(
        serializeBattleSnapshot(runB.getSnapshot())
      );
    }
  });

  it("returns stable serializable match results", () => {
    const config = createRandomBattleConfig({
      eraId: "civil_war",
      mapType: "field",
      seed: 21,
      playerFactionIndex: 1
    });
    const sim = createBattleSimulator(config);
    sim.step(360);
    const result = sim.getResult();
    expect(result).not.toBeNull();
    const asJson = JSON.stringify(result);
    expect(asJson).toContain("winner");
    expect(asJson).toContain("durationSeconds");
  });
});
