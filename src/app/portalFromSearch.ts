import { createRandomBattleConfig } from "@/app/createBattleConfig";
import {
  isPortalEntryFromUrl,
  parseEraFromUrl,
  parseSeedFromUrl
} from "@/shared/vibeJamPortal";
import type { BattleConfig } from "@/shared/types";

export interface PortalBattleBootstrap {
  screen: "battle";
  battleFlow: null;
  config: BattleConfig;
  snapshot: null;
  result: null;
  selectedUnitIds: string[];
}

export function portalBattleStateFromSearch(search: string): PortalBattleBootstrap | null {
  if (!isPortalEntryFromUrl(search)) {
    return null;
  }
  const portalParams = new URLSearchParams(search);
  const factionRaw = portalParams.get("faction");
  const playerFactionIndex = factionRaw === "1" ? 1 : 0;
  return {
    screen: "battle",
    battleFlow: null,
    config: createRandomBattleConfig({
      eraId: parseEraFromUrl(portalParams.get("era")),
      mapType: "field",
      seed: parseSeedFromUrl(portalParams.get("seed")),
      playerFactionIndex: playerFactionIndex as 0 | 1
    }),
    snapshot: null,
    result: null,
    selectedUnitIds: []
  };
}
