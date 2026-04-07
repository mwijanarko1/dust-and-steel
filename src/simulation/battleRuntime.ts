import { GAME_CONTENT } from "@/content/catalog";
import { BattleRenderer } from "@/rendering/BattleRenderer";
import { createBattleSimulator } from "@/simulation/battleSimulator";
import { DEFENDER_DEPLOYMENT_SECONDS, E2E_SKIP_BATTLE_PREP_KEY } from "@/shared/battlePrep";
import type { BattleConfig, BattleFlowState, BattleSnapshot, MatchResult, Vector2 } from "@/shared/types";
import {
  anyPlayerUnitInPortalRadius,
  buildJamExitUrl,
  buildRefReturnUrl,
  getPortalWorldPositions,
  getRefFromUrl,
  isPortalEntryFromUrl
} from "@/shared/vibeJamPortal";

type FlowPhase = "briefing" | "deployment" | "combat";

type E2eDebugWindow = Window & {
  __DUST_STEEL_E2E__?: { fastForward: (seconds: number) => void };
};

interface BattleRuntimeCallbacks {
  onSnapshot: (snapshot: BattleSnapshot) => void;
  onBattleEnd: (result: MatchResult) => void;
  onSelectedUnits: (unitIds: string[]) => void;
  onBattleFlow: (state: BattleFlowState) => void;
}

export interface BattleRuntimeRestore {
  snapshot: BattleSnapshot;
  battleFlow: BattleFlowState;
  selectedUnitIds: string[];
}

export class BattleRuntime {
  private readonly config: BattleConfig;
  private readonly callbacks: BattleRuntimeCallbacks;
  private readonly simulator: ReturnType<typeof createBattleSimulator>;
  private renderer: BattleRenderer | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isPaused = false;
  private lastTimestamp = 0;
  private accumulator = 0;
  private selectedUnitIds: string[] = [];
  private latestSnapshot: BattleSnapshot;
  private resultEmitted = false;
  private portalRedirectIssued = false;
  private flowPhase: FlowPhase;
  private deploymentElapsed = 0;
  private lastEmittedDeploymentRemaining = -999;

  constructor(
    config: BattleConfig,
    callbacks: BattleRuntimeCallbacks,
    restore?: BattleRuntimeRestore | null
  ) {
    this.config = config;
    this.callbacks = callbacks;

    const skipPrep =
      typeof localStorage !== "undefined" && localStorage.getItem(E2E_SKIP_BATTLE_PREP_KEY) === "1";

    if (skipPrep) {
      this.simulator = createBattleSimulator(config);
      this.latestSnapshot = this.simulator.getSnapshot();
      this.flowPhase = "combat";
    } else if (restore?.snapshot && restore.battleFlow) {
      this.simulator = createBattleSimulator(config, { hydrateFromSnapshot: restore.snapshot });
      this.latestSnapshot = this.simulator.getSnapshot();
      this.selectedUnitIds = restore.selectedUnitIds;
      if (restore.battleFlow.phase === "attacker_briefing") {
        this.flowPhase = "briefing";
      } else if (restore.battleFlow.phase === "defender_deployment") {
        this.flowPhase = "deployment";
        this.deploymentElapsed = Math.max(
          0,
          DEFENDER_DEPLOYMENT_SECONDS - restore.battleFlow.secondsRemaining
        );
      } else {
        this.flowPhase = "combat";
      }
    } else {
      this.simulator = createBattleSimulator(config);
      this.latestSnapshot = this.simulator.getSnapshot();

      if (config.playerRole === "attacker") {
        this.flowPhase = "briefing";
      } else {
        this.flowPhase = "deployment";
        this.simulator.prepareDefenderDeployment();
      }
    }
  }

  start(container: HTMLElement): void {
    if (this.isRunning) {
      return;
    }
    try {
      this.renderer = new BattleRenderer(container, {
        onPlayerUnitSelect: (unitId, shiftKey) => this.handlePlayerUnitSelect(unitId, shiftKey),
        onEnemyUnitClick: (unitId) => this.handleEnemyUnitClick(unitId),
        onDragMoveOrder: (unitId, position) => this.handleDragMoveOrder(unitId, position),
        onSelectionBox: (unitIds, additive) => this.handleSelectionBox(unitIds, additive),
        onGroundClick: (shiftKey) => this.handleGroundClick(shiftKey)
      });
    } catch (error) {
      console.warn("Renderer initialization failed, running without 3D view.", error);
      this.renderer = null;
    }
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.emitBattleFlowState();
    if (this.selectedUnitIds.length > 0) {
      this.callbacks.onSelectedUnits(this.selectedUnitIds);
    }
    this.emitFrame();
    this.animationFrameId = window.requestAnimationFrame(this.loop);
    this.attachE2eDebugHooks();
  }

  stop(): void {
    this.isRunning = false;
    this.detachE2eDebugHooks();
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderer?.dispose();
    this.renderer = null;
  }

  private attachE2eDebugHooks(): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      if (localStorage.getItem(E2E_SKIP_BATTLE_PREP_KEY) !== "1") {
        return;
      }
    } catch {
      return;
    }
    const self = this;
    (window as E2eDebugWindow).__DUST_STEEL_E2E__ = {
      fastForward(seconds: number) {
        self.fastForward(seconds);
      }
    };
  }

  private detachE2eDebugHooks(): void {
    if (typeof window === "undefined") {
      return;
    }
    const w = window as E2eDebugWindow;
    if (w.__DUST_STEEL_E2E__) {
      delete w.__DUST_STEEL_E2E__;
    }
  }

  beginAttackerAssault(): void {
    if (this.flowPhase !== "briefing") {
      return;
    }
    this.flowPhase = "combat";
    this.emitBattleFlowState();
  }

  togglePause(): void {
    if (this.flowPhase === "briefing") {
      return;
    }
    this.isPaused = !this.isPaused;
  }

  fastForward(seconds: number): void {
    if (this.flowPhase !== "combat") {
      return;
    }
    this.simulator.step(seconds);
    this.latestSnapshot = this.simulator.getSnapshot();
    this.emitFrame();
  }

  private emitBattleFlowState(): void {
    if (this.flowPhase === "briefing") {
      this.callbacks.onBattleFlow({ phase: "attacker_briefing" });
      return;
    }
    if (this.flowPhase === "deployment") {
      const remaining = Math.max(0, DEFENDER_DEPLOYMENT_SECONDS - this.deploymentElapsed);
      this.lastEmittedDeploymentRemaining = remaining;
      this.callbacks.onBattleFlow({ phase: "defender_deployment", secondsRemaining: remaining });
      return;
    }
    this.callbacks.onBattleFlow({ phase: "combat" });
  }

  private maybeEmitDeploymentCountdown(): void {
    if (this.flowPhase !== "deployment") {
      return;
    }
    const remaining = Math.max(0, DEFENDER_DEPLOYMENT_SECONDS - this.deploymentElapsed);
    if (Math.abs(remaining - this.lastEmittedDeploymentRemaining) >= 0.08) {
      this.lastEmittedDeploymentRemaining = remaining;
      this.callbacks.onBattleFlow({ phase: "defender_deployment", secondsRemaining: remaining });
    }
  }

  private readonly loop = (timestamp: number): void => {
    if (!this.isRunning) {
      return;
    }

    const deltaSeconds = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    if (this.flowPhase === "briefing") {
      this.latestSnapshot = this.simulator.getSnapshot();
    } else if (this.flowPhase === "deployment") {
      if (!this.isPaused) {
        this.deploymentElapsed += deltaSeconds;
        this.accumulator += deltaSeconds;
        const fixedStep = 1 / 20;
        while (this.accumulator >= fixedStep) {
          this.simulator.stepPlayerDeployment(fixedStep);
          this.accumulator -= fixedStep;
        }
      }
      if (this.deploymentElapsed >= DEFENDER_DEPLOYMENT_SECONDS) {
        this.flowPhase = "combat";
        this.emitBattleFlowState();
      } else {
        this.maybeEmitDeploymentCountdown();
      }
      this.latestSnapshot = this.simulator.getSnapshot();
    } else {
      if (!this.isPaused) {
        this.accumulator += deltaSeconds;
        const fixedStep = 1 / 20;
        while (this.accumulator >= fixedStep) {
          this.simulator.step(fixedStep);
          this.accumulator -= fixedStep;
        }
      }
      this.latestSnapshot = this.simulator.getSnapshot();
    }

    this.emitFrame();
    this.animationFrameId = window.requestAnimationFrame(this.loop);
  };

  private emitFrame(): void {
    this.callbacks.onSnapshot(this.latestSnapshot);
    const allowDragOrders = this.flowPhase === "deployment" || this.flowPhase === "combat";
    this.renderer?.sync(this.config, this.latestSnapshot, this.selectedUnitIds, {
      allowDragOrders
    });
    this.renderer?.render();

    if (this.flowPhase === "combat") {
      this.maybeRedirectThroughPortals();
    }

    const result = this.simulator.getResult();
    if (result && !this.resultEmitted) {
      this.resultEmitted = true;
      this.callbacks.onBattleEnd(result);
    }
  }

  private handlePlayerUnitSelect(unitId: string, shiftKey: boolean): void {
    if (this.flowPhase === "briefing") {
      return;
    }

    if (shiftKey) {
      const next = new Set(this.selectedUnitIds);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      this.selectedUnitIds = [...next];
      this.callbacks.onSelectedUnits(this.selectedUnitIds);
      return;
    }

    // Without Shift: replace selection when clicking a unit outside the current
    // selection. Clicking a unit that is already selected keeps the group so a
    // drag move can relocate everyone at once.
    if (!this.selectedUnitIds.includes(unitId)) {
      this.selectedUnitIds = [unitId];
      this.callbacks.onSelectedUnits(this.selectedUnitIds);
    }
  }

  private handleEnemyUnitClick(unitId: string): void {
    if (this.flowPhase !== "combat") {
      return;
    }

    const target = this.latestSnapshot.units.find((candidate) => candidate.id === unitId);
    if (!target || target.side === this.config.playerRole) {
      return;
    }

    if (this.selectedUnitIds.length === 0) {
      return;
    }

    for (const allyId of this.selectedUnitIds) {
      const ally = this.latestSnapshot.units.find((candidate) => candidate.id === allyId);
      if (!ally || ally.side !== this.config.playerRole || ally.health <= 0) {
        continue;
      }
      this.simulator.issueOrder({
        unitId: allyId,
        commandType: "attack-move",
        targetUnitId: target.id,
        targetPosition: { ...target.position }
      });
    }
  }

  private handleGroundClick(shiftKey: boolean): void {
    if (this.flowPhase === "briefing") {
      return;
    }
    if (!shiftKey) {
      this.selectedUnitIds = [];
      this.callbacks.onSelectedUnits([]);
    }
  }

  private handleSelectionBox(unitIds: string[], additive: boolean): void {
    if (this.flowPhase === "briefing") {
      return;
    }
    if (additive) {
      this.selectedUnitIds = [...new Set([...this.selectedUnitIds, ...unitIds])];
    } else {
      this.selectedUnitIds = unitIds;
    }
    this.callbacks.onSelectedUnits(this.selectedUnitIds);
  }

  private handleDragMoveOrder(primaryUnitId: string, position: Vector2): void {
    if (this.flowPhase === "briefing") {
      return;
    }

    const movers = this.selectedUnitIds.includes(primaryUnitId)
      ? this.selectedUnitIds
      : [primaryUnitId];

    for (const unitId of movers) {
      const unit = this.latestSnapshot.units.find((candidate) => candidate.id === unitId);
      if (!unit || unit.side !== this.config.playerRole || unit.health <= 0) {
        continue;
      }
      this.simulator.issueOrder({
        unitId,
        commandType: "move",
        targetPosition: position
      });
    }
  }

  private maybeRedirectThroughPortals(): void {
    if (this.portalRedirectIssued || typeof window === "undefined") {
      return;
    }

    const map = GAME_CONTENT.mapsByEra[this.config.selectedEra].find(
      (definition) => definition.id === this.config.mapId
    );
    if (!map) {
      return;
    }

    const positions = getPortalWorldPositions(map.size.width, map.size.depth);
    const search = window.location.search;

    if (isPortalEntryFromUrl(search) && getRefFromUrl(search)) {
      if (anyPlayerUnitInPortalRadius(this.latestSnapshot, this.config, positions.start)) {
        const target = buildRefReturnUrl(search);
        if (target) {
          this.portalRedirectIssued = true;
          window.location.assign(target);
        }
        return;
      }
    }

    if (anyPlayerUnitInPortalRadius(this.latestSnapshot, this.config, positions.exit)) {
      this.portalRedirectIssued = true;
      window.location.assign(buildJamExitUrl(this.latestSnapshot, this.config));
    }
  }
}
