import type { EraId } from "@/shared/types";

/** Per-era combat tuning (suppression/objective pacing). Doctrine fields handle formation and melee charge. */
export interface EraCombatTuning {
  suppressionRecoveryPerSecond: number;
  objectivePresenceMultiplier: number;
}

export const ERA_COMBAT_TUNING: Record<EraId, EraCombatTuning> = {
  ayyubid: {
    suppressionRecoveryPerSecond: 0.09,
    objectivePresenceMultiplier: 4.2
  },
  civil_war: {
    suppressionRecoveryPerSecond: 0.065,
    objectivePresenceMultiplier: 3.6
  },
  modern: {
    suppressionRecoveryPerSecond: 0.11,
    objectivePresenceMultiplier: 3.1
  }
};

export function getEraCombatTuning(eraId: EraId): EraCombatTuning {
  return ERA_COMBAT_TUNING[eraId];
}

/** Melee band: chargeImpact applies to strikes in range with short-reach weapons only. */
export const MELEE_WEAPON_RANGE_CAP = 4;
