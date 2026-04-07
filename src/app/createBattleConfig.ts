import { GAME_CONTENT } from "@/content/catalog";
import { createRandom } from "@/shared/rng";
import type { BattleConfig, EraId, MapType } from "@/shared/types";

interface BattleConfigInput {
  eraId: EraId;
  mapType: MapType;
  seed?: number;
  playerFactionIndex?: 0 | 1;
}

export function createRandomBattleConfig(input: BattleConfigInput): BattleConfig {
  const seed = input.seed ?? Math.floor(Date.now() % 2_147_483_647);
  const random = createRandom(seed);
  const era = GAME_CONTENT.eras[input.eraId];
  const mapPool = GAME_CONTENT.mapsByEra[input.eraId].filter((mapDefinition) => mapDefinition.type === input.mapType);

  if (mapPool.length === 0) {
    throw new Error(`Missing map for ${input.eraId} / ${input.mapType}`);
  }

  const selectedMap = mapPool[0];
  if (!selectedMap) {
    throw new Error(`No map selected for ${input.eraId} / ${input.mapType}`);
  }
  const playerFactionIndex = input.playerFactionIndex ?? (random.int(0, 1) as 0 | 1);
  const playerFactionId = era.factionIds[playerFactionIndex];
  const enemyFactionId = era.factionIds[playerFactionIndex === 0 ? 1 : 0];
  const playerRole = random.float() > 0.5 ? "attacker" : "defender";
  const unitCap = random.int(8, 12);

  return {
    selectedEra: input.eraId,
    mapType: input.mapType,
    mapId: selectedMap.id,
    seed,
    playerFactionId,
    enemyFactionId,
    playerRole,
    unitCap
  };
}
