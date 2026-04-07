import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { portalBattleStateFromSearch } from "@/app/portalFromSearch";
import type { BattleConfig, BattleFlowState, BattleSnapshot, EraId, MatchResult } from "@/shared/types";

export type AppScreen = "splash" | "setup" | "battle" | "summary";

interface SetupState {
  eraId: EraId;
  playerFactionIndex: 0 | 1;
}

interface GameStoreState {
  screen: AppScreen;
  setup: SetupState;
  config: BattleConfig | null;
  battleFlow: BattleFlowState | null;
  snapshot: BattleSnapshot | null;
  selectedUnitIds: string[];
  result: MatchResult | null;
  setScreen: (screen: AppScreen) => void;
  setSetup: (update: Partial<SetupState>) => void;
  setConfig: (config: BattleConfig | null) => void;
  setBattleFlow: (state: BattleFlowState | null) => void;
  setSnapshot: (snapshot: BattleSnapshot | null) => void;
  setSelectedUnits: (unitIds: string[]) => void;
  setResult: (result: MatchResult | null) => void;
  resetToSetup: () => void;
}

const defaultSetup: SetupState = {
  eraId: "ayyubid",
  playerFactionIndex: 0
};

const PERSIST_KEY = "dust-and-steel-game";

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      screen: "splash",
      setup: defaultSetup,
      config: null,
      battleFlow: null,
      snapshot: null,
      selectedUnitIds: [],
      result: null,
      setScreen: (screen) => set({ screen }),
      setSetup: (update) => set((state) => ({ setup: { ...state.setup, ...update } })),
      setConfig: (config) => set({ config }),
      setBattleFlow: (battleFlow) => set({ battleFlow }),
      setSnapshot: (snapshot) => set({ snapshot }),
      setSelectedUnits: (selectedUnitIds) => set({ selectedUnitIds }),
      setResult: (result) => set({ result }),
      resetToSetup: () =>
        set({
          screen: "setup",
          config: null,
          battleFlow: null,
          snapshot: null,
          selectedUnitIds: [],
          result: null,
          setup: defaultSetup
        })
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        screen: state.screen,
        setup: state.setup,
        config: state.config,
        battleFlow: state.battleFlow,
        snapshot: state.snapshot,
        selectedUnitIds: state.selectedUnitIds,
        result: state.result
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStoreState>;
        const legacyId = (p as { selectedUnitId?: string | null }).selectedUnitId;
        const selectedUnitIds = Array.isArray(p.selectedUnitIds)
          ? p.selectedUnitIds
          : legacyId
            ? [legacyId]
            : current.selectedUnitIds;

        const next: GameStoreState = {
          ...current,
          ...p,
          selectedUnitIds,
          setup: p.setup !== undefined ? { ...defaultSetup, ...p.setup } : current.setup
        };
        if (next.screen === "battle" && !next.config) {
          return {
            ...next,
            screen: "setup",
            battleFlow: null,
            snapshot: null,
            selectedUnitIds: []
          };
        }
        if (next.screen === "summary" && !next.result) {
          return { ...next, screen: "setup", result: null };
        }
        return next;
      },
      onRehydrateStorage: () => () => {
        if (typeof window === "undefined") {
          return;
        }
        const portalState = portalBattleStateFromSearch(window.location.search);
        if (portalState) {
          useGameStore.setState(portalState);
        }
      }
    }
  )
);
