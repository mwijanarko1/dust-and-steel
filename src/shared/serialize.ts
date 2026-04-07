import type { BattleSnapshot } from "@/shared/types";

export function serializeBattleSnapshot(snapshot: BattleSnapshot): string {
  return JSON.stringify(snapshot);
}
