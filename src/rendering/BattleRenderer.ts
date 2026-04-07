import * as THREE from "three";
import { GAME_CONTENT } from "@/content/catalog";
import { createObstacleRoot, disposeObstacleRoot } from "@/rendering/battlefieldObstacles";
import { VibeJamPortalVisuals } from "@/rendering/vibeJamPortalVisuals";
import type { BattleConfig, BattleSnapshot, EraId, Vector2 } from "@/shared/types";
import { getPortalWorldPositions, getRefFromUrl, isPortalEntryFromUrl } from "@/shared/vibeJamPortal";

const DRAG_THRESHOLD_PX = 10;
const SELECTION_RING_POOL = 36;

const ERA_BATTLEFIELD_THEME: Record<
  EraId,
  {
    background: string;
    ground: string;
    gridCenter: number;
    gridLine: number;
    ambient: number;
    ambientIntensity: number;
    key: number;
    keyIntensity: number;
  }
> = {
  ayyubid: {
    background: "#c4b69a",
    ground: "#b0a078",
    gridCenter: 0x6e5e48,
    gridLine: 0x8a7a62,
    ambient: 0xe8dcc4,
    ambientIntensity: 0.98,
    key: 0xfff2dc,
    keyIntensity: 1.18
  },
  civil_war: {
    background: "#6a7a52",
    ground: "#758a5c",
    gridCenter: 0x3d4a30,
    gridLine: 0x556642,
    ambient: 0xc8d8b0,
    ambientIntensity: 0.9,
    key: 0xecf4d8,
    keyIntensity: 1.02
  },
  modern: {
    background: "#5e5c5a",
    ground: "#4e4c4a",
    gridCenter: 0x3a3836,
    gridLine: 0x4c4a48,
    ambient: 0x989690,
    ambientIntensity: 1.02,
    key: 0xb8b6b0,
    keyIntensity: 0.92
  }
};

interface BattleRendererCallbacks {
  onPlayerUnitSelect: (unitId: string, shiftKey: boolean) => void;
  onEnemyUnitClick: (unitId: string) => void;
  onDragMoveOrder: (unitId: string, target: Vector2) => void;
  onSelectionBox: (unitIds: string[], shiftAdditive: boolean) => void;
  onGroundClick: (shiftKey: boolean) => void;
}

export interface BattleRendererSyncOptions {
  allowDragOrders: boolean;
}

export class BattleRenderer {
  private readonly container: HTMLElement;
  private readonly callbacks: BattleRendererCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly raycaster: THREE.Raycaster;
  private readonly pointer: THREE.Vector2;
  private readonly groundPlane: THREE.Mesh;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly keyLight: THREE.DirectionalLight;
  private gridHelper: THREE.GridHelper;
  private lastBattlefieldThemeKey = "";
  private readonly unitMeshes = new Map<string, THREE.Mesh>();
  private readonly objectiveMeshes = new Map<string, THREE.Mesh>();
  private readonly cameraDragOrigin = new THREE.Vector2(0, 0);
  private readonly cameraOffset = new THREE.Vector3(0, 0, 0);
  private readonly selectionRingGeometry: THREE.RingGeometry;
  private readonly selectionRingMaterial: THREE.MeshBasicMaterial;
  private readonly selectionRingPool: THREE.Mesh[] = [];
  private marquee:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        shiftKey: boolean;
        active: boolean;
      }
    | null = null;
  private readonly marqueeDiv: HTMLDivElement;
  private readonly portalVisuals: VibeJamPortalVisuals;
  private readonly obstacleGroup: THREE.Group;
  private readonly commandLine: THREE.Line;
  private readonly commandLineGeometry: THREE.BufferGeometry;
  private cameraPanning = false;
  private mapHalfWidth = 100;
  private mapHalfDepth = 80;
  private obstacleMapKey = "";

  private lastConfig: BattleConfig | null = null;
  private lastSnapshot: BattleSnapshot | null = null;
  private lastAllowDragOrders = false;

  private orderDrag:
    | {
        unitId: string;
        pointerId: number;
        startClientX: number;
        startClientY: number;
      }
    | null = null;
  private orderDragActive = false;
  private orderDragEnd: Vector2 | null = null;
  private enemySelectGesture: { unitId: string; pointerId: number; startX: number; startY: number } | null = null;

  constructor(container: HTMLElement, callbacks: BattleRendererCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#d8d1bd");

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 500);
    this.camera.position.set(0, 120, 82);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.ambientLight = new THREE.AmbientLight(0xf3ece0, 1);
    this.keyLight = new THREE.DirectionalLight(0xfbf8f0, 1.25);
    this.keyLight.position.set(-40, 80, 24);
    this.scene.add(this.ambientLight, this.keyLight);

    const boardGeometry = new THREE.PlaneGeometry(220, 180, 1, 1);
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: "#b6b09f",
      roughness: 0.92,
      metalness: 0.04
    });
    this.groundPlane = new THREE.Mesh(boardGeometry, boardMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    this.selectionRingGeometry = new THREE.RingGeometry(1.7, 2.2, 36);
    this.selectionRingMaterial = new THREE.MeshBasicMaterial({
      color: "#ba4f2f",
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < SELECTION_RING_POOL; i += 1) {
      const ring = new THREE.Mesh(this.selectionRingGeometry, this.selectionRingMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      ring.visible = false;
      this.scene.add(ring);
      this.selectionRingPool.push(ring);
    }

    this.marqueeDiv = document.createElement("div");
    Object.assign(this.marqueeDiv.style, {
      display: "none",
      position: "absolute",
      zIndex: "12",
      pointerEvents: "none",
      boxSizing: "border-box",
      border: "2px dashed rgba(186, 79, 47, 0.95)",
      background: "rgba(186, 79, 47, 0.12)",
      borderRadius: "2px"
    });

    this.portalVisuals = new VibeJamPortalVisuals(this.scene);

    this.gridHelper = new THREE.GridHelper(220, 40, 0x887a62, 0x9c8d74);
    this.gridHelper.position.y = 0.03;
    this.scene.add(this.gridHelper);

    this.obstacleGroup = new THREE.Group();
    this.scene.add(this.obstacleGroup);

    this.commandLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.25, 0),
      new THREE.Vector3(0, 0.25, 0)
    ]);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xba4f2f,
      dashSize: 2.5,
      gapSize: 1.2,
      transparent: true,
      opacity: 0.92
    });
    this.commandLine = new THREE.Line(this.commandLineGeometry, lineMaterial);
    this.commandLine.visible = false;
    this.commandLine.computeLineDistances();
    this.scene.add(this.commandLine);

    if (!this.container.style.position) {
      this.container.style.position = "relative";
    }
    container.appendChild(this.renderer.domElement);
    container.appendChild(this.marqueeDiv);
    this.resize();
    this.installEvents();
  }

  private installEvents(): void {
    window.addEventListener("resize", this.resize);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.addEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const delta = event.deltaY * 0.04;
    this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y + delta, 58, 160);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + delta * 0.5, 42, 130);
    this.camera.lookAt(this.cameraOffset);
  };

  private updatePointerFromEvent(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private pickGroundPoint(): Vector2 | null {
    const groundHits = this.raycaster.intersectObject(this.groundPlane, false);
    const hit = groundHits[0];
    if (!hit) {
      return null;
    }
    return { x: hit.point.x, z: hit.point.z };
  }

  private pickUnitId(): string | null {
    const unitHits = this.raycaster.intersectObjects([...this.unitMeshes.values()], false);
    const first = unitHits[0];
    if (!first) {
      return null;
    }
    const mesh = first.object as THREE.Mesh;
    return (mesh.userData["unitId"] as string | undefined) ?? null;
  }

  private worldXZToClient(worldX: number, worldZ: number): { x: number; y: number } {
    const v = new THREE.Vector3(worldX, 1.2, worldZ);
    v.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (v.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
    return { x, y };
  }

  private collectPlayerUnitsInMarquee(sx: number, sy: number, ex: number, ey: number): string[] {
    const snap = this.lastSnapshot;
    const cfg = this.lastConfig;
    if (!snap || !cfg) {
      return [];
    }
    const boxLeft = Math.min(sx, ex);
    const boxTop = Math.min(sy, ey);
    const boxRight = Math.max(sx, ex);
    const boxBottom = Math.max(sy, ey);
    const ids: string[] = [];
    for (const unit of snap.units) {
      if (unit.side !== cfg.playerRole || unit.health <= 0) {
        continue;
      }
      const p = this.worldXZToClient(unit.position.x, unit.position.z);
      if (p.x >= boxLeft && p.x <= boxRight && p.y >= boxTop && p.y <= boxBottom) {
        ids.push(unit.id);
      }
    }
    return ids;
  }

  private updateMarqueeDiv(curX: number, curY: number): void {
    if (!this.marquee) {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x1 = Math.min(this.marquee.startX, curX);
    const y1 = Math.min(this.marquee.startY, curY);
    const x2 = Math.max(this.marquee.startX, curX);
    const y2 = Math.max(this.marquee.startY, curY);
    this.marqueeDiv.style.display = "block";
    this.marqueeDiv.style.left = `${x1 - rect.left}px`;
    this.marqueeDiv.style.top = `${y1 - rect.top}px`;
    this.marqueeDiv.style.width = `${Math.max(1, x2 - x1)}px`;
    this.marqueeDiv.style.height = `${Math.max(1, y2 - y1)}px`;
  }

  private hideMarquee(): void {
    this.marqueeDiv.style.display = "none";
  }

  private isPlayerUnit(unitId: string): boolean {
    const snap = this.lastSnapshot;
    const cfg = this.lastConfig;
    if (!snap || !cfg) {
      return false;
    }
    const unit = snap.units.find((u) => u.id === unitId);
    return unit !== undefined && unit.side === cfg.playerRole;
  }

  private clearOrderDrag(): void {
    this.orderDrag = null;
    this.orderDragActive = false;
    this.orderDragEnd = null;
    this.commandLine.visible = false;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button === 1) {
      this.cameraPanning = true;
      this.cameraDragOrigin.set(event.clientX, event.clientY);
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    this.updatePointerFromEvent(event);
    const unitId = this.pickUnitId();

    if (unitId && this.lastAllowDragOrders && this.isPlayerUnit(unitId)) {
      this.enemySelectGesture = null;
      this.marquee = null;
      this.hideMarquee();
      this.orderDrag = {
        unitId,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY
      };
      this.orderDragActive = false;
      this.orderDragEnd = null;
      this.callbacks.onPlayerUnitSelect(unitId, event.shiftKey);
      this.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }

    if (unitId && !this.isPlayerUnit(unitId)) {
      this.orderDrag = null;
      this.orderDragActive = false;
      this.orderDragEnd = null;
      this.marquee = null;
      this.hideMarquee();
      this.enemySelectGesture = {
        unitId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      };
      return;
    }

    this.clearOrderDrag();
    this.enemySelectGesture = null;
    this.marquee = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      shiftKey: event.shiftKey,
      active: false
    };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.cameraPanning) {
      const dx = event.clientX - this.cameraDragOrigin.x;
      const dy = event.clientY - this.cameraDragOrigin.y;
      this.cameraDragOrigin.set(event.clientX, event.clientY);
      this.cameraOffset.x = THREE.MathUtils.clamp(this.cameraOffset.x - dx * 0.2, -this.mapHalfWidth, this.mapHalfWidth);
      this.cameraOffset.z = THREE.MathUtils.clamp(this.cameraOffset.z + dy * 0.2, -this.mapHalfDepth, this.mapHalfDepth);
      this.camera.position.x = this.cameraOffset.x;
      this.camera.lookAt(this.cameraOffset);
      return;
    }

    if (this.marquee && event.pointerId === this.marquee.pointerId) {
      const dx = event.clientX - this.marquee.startX;
      const dy = event.clientY - this.marquee.startY;
      if (!this.marquee.active && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        this.marquee.active = true;
      }
      if (this.marquee.active) {
        this.updateMarqueeDiv(event.clientX, event.clientY);
      }
      return;
    }

    if (!this.orderDrag || event.pointerId !== this.orderDrag.pointerId) {
      return;
    }

    const dx = event.clientX - this.orderDrag.startClientX;
    const dy = event.clientY - this.orderDrag.startClientY;
    if (!this.orderDragActive && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      this.orderDragActive = true;
    }

    if (!this.orderDragActive) {
      return;
    }

    this.updatePointerFromEvent(event);
    this.orderDragEnd = this.pickGroundPoint();
    this.updateCommandLineVisual();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.button === 1) {
      this.cameraPanning = false;
    }

    if (this.marquee && event.pointerId === this.marquee.pointerId) {
      try {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        /* capture may already be released */
      }
      const m = this.marquee;
      this.marquee = null;
      if (m.active) {
        const ids = this.collectPlayerUnitsInMarquee(m.startX, m.startY, event.clientX, event.clientY);
        this.callbacks.onSelectionBox(ids, m.shiftKey);
      } else {
        this.callbacks.onGroundClick(m.shiftKey);
      }
      this.hideMarquee();
    }

    if (this.orderDrag && event.pointerId === this.orderDrag.pointerId) {
      try {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        /* capture may already be released */
      }
      if (this.orderDragActive && this.orderDragEnd) {
        this.callbacks.onDragMoveOrder(this.orderDrag.unitId, this.orderDragEnd);
      }
      this.clearOrderDrag();
    }

    if (this.enemySelectGesture && event.pointerId === this.enemySelectGesture.pointerId) {
      const g = this.enemySelectGesture;
      const moved = Math.hypot(event.clientX - g.startX, event.clientY - g.startY);
      if (moved < DRAG_THRESHOLD_PX) {
        this.callbacks.onEnemyUnitClick(g.unitId);
      }
      this.enemySelectGesture = null;
    }
  };

  private updateCommandLineVisual(): void {
    const drag = this.orderDrag;
    const end = this.orderDragEnd;
    if (!this.orderDragActive || !drag || !end) {
      this.commandLine.visible = false;
      return;
    }
    const unit = this.lastSnapshot?.units.find((u) => u.id === drag.unitId);
    if (!unit) {
      this.commandLine.visible = false;
      return;
    }
    const ax = unit.position.x;
    const az = unit.position.z;
    const bx = end.x;
    const bz = end.z;
    const positions = this.commandLineGeometry.getAttribute("position") as THREE.BufferAttribute;
    positions.setXYZ(0, ax, 0.28, az);
    positions.setXYZ(1, bx, 0.28, bz);
    positions.needsUpdate = true;
    this.commandLineGeometry.computeBoundingSphere();
    this.commandLine.computeLineDistances();
    this.commandLine.visible = true;
  }

  private clearObstacles(): void {
    while (this.obstacleGroup.children.length > 0) {
      const child = this.obstacleGroup.children[0];
      if (child) {
        this.obstacleGroup.remove(child);
        disposeObstacleRoot(child);
      }
    }
  }

  private readonly resize = (): void => {
    const width = Math.max(200, this.container.clientWidth);
    const height = Math.max(200, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private applyBattlefieldTheme(eraId: EraId, mapWidth: number, mapDepth: number, mapId: string): void {
    const key = `${mapId}:${mapWidth}:${mapDepth}`;
    if (this.lastBattlefieldThemeKey === key) {
      return;
    }
    this.lastBattlefieldThemeKey = key;
    const theme = ERA_BATTLEFIELD_THEME[eraId];
    this.scene.background = new THREE.Color(theme.background);
    const groundMat = this.groundPlane.material as THREE.MeshStandardMaterial;
    groundMat.color.set(theme.ground);
    this.ambientLight.color.setHex(theme.ambient);
    this.ambientLight.intensity = theme.ambientIntensity;
    this.keyLight.color.setHex(theme.key);
    this.keyLight.intensity = theme.keyIntensity;
    this.scene.remove(this.obstacleGroup);
    this.scene.remove(this.gridHelper);
    this.gridHelper.geometry.dispose();
    const oldGridMat = this.gridHelper.material;
    if (Array.isArray(oldGridMat)) {
      for (const m of oldGridMat) {
        m.dispose();
      }
    } else {
      oldGridMat.dispose();
    }
    const divisions = Math.max(22, Math.round(mapWidth / 4.2));
    this.gridHelper = new THREE.GridHelper(mapWidth, divisions, theme.gridCenter, theme.gridLine);
    this.gridHelper.position.y = 0.03;
    this.scene.add(this.gridHelper);
    this.scene.add(this.obstacleGroup);
  }

  sync(
    config: BattleConfig,
    snapshot: BattleSnapshot,
    selectedUnitIds: string[],
    options: BattleRendererSyncOptions
  ): void {
    this.lastConfig = config;
    this.lastSnapshot = snapshot;
    this.lastAllowDragOrders = options.allowDragOrders;

    const map = GAME_CONTENT.mapsByEra[config.selectedEra].find((definition) => definition.id === config.mapId);
    if (map) {
      this.mapHalfWidth = map.size.width * 0.5;
      this.mapHalfDepth = map.size.depth * 0.5;
      this.groundPlane.scale.set(map.size.width / 220, map.size.depth / 180, 1);
      this.applyBattlefieldTheme(config.selectedEra, map.size.width, map.size.depth, map.id);
      const portalPos = getPortalWorldPositions(map.size.width, map.size.depth);
      const search = typeof window !== "undefined" ? window.location.search : "";
      const showReturn =
        isPortalEntryFromUrl(search) && getRefFromUrl(search) !== null;
      this.portalVisuals.sync({
        exit: portalPos.exit,
        start: showReturn ? portalPos.start : null
      });

      if (this.obstacleMapKey !== map.id) {
        this.clearObstacles();
        this.obstacleMapKey = map.id;
        for (const obs of map.obstacleVisuals) {
          const root = createObstacleRoot(obs);
          root.position.set(obs.center.x, 0, obs.center.z);
          this.obstacleGroup.add(root);
        }
      }
    } else {
      this.clearObstacles();
      this.obstacleMapKey = "";
      this.lastBattlefieldThemeKey = "";
    }

    for (const unit of snapshot.units) {
      if (!this.unitMeshes.has(unit.id)) {
        const faction = GAME_CONTENT.factions[unit.factionId];
        if (!faction) {
          continue;
        }
        const geometry = new THREE.CylinderGeometry(0.8, 1.2, 2.2, 16);
        const material = new THREE.MeshStandardMaterial({
          color: unit.side === "attacker" ? faction.palette.primary : faction.palette.secondary,
          roughness: 0.45,
          metalness: 0.08
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData["unitId"] = unit.id;
        mesh.position.set(unit.position.x, 1.2, unit.position.z);
        this.unitMeshes.set(unit.id, mesh);
        this.scene.add(mesh);
      }

      const mesh = this.unitMeshes.get(unit.id);
      if (!mesh) {
        continue;
      }
      mesh.position.set(unit.position.x, 1.2, unit.position.z);
      mesh.rotation.y = unit.facing;
      const healthRatio = unit.health / 120;
      mesh.scale.setScalar(unit.isRouted ? 0.72 : 0.85 + healthRatio * 0.2);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(unit.isRouted ? "#1a1111" : "#000000");
    }

    for (const objective of snapshot.objectives) {
      if (!this.objectiveMeshes.has(objective.id)) {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(objective.radius * 0.16, objective.radius * 0.16, 0.4, 20),
          new THREE.MeshStandardMaterial({ color: "#6f6a5e", roughness: 0.82, metalness: 0.05 })
        );
        mesh.position.set(objective.position.x, 0.22, objective.position.z);
        this.objectiveMeshes.set(objective.id, mesh);
        this.scene.add(mesh);
      }

      const mesh = this.objectiveMeshes.get(objective.id);
      if (!mesh) {
        continue;
      }
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (objective.controller === "attacker") {
        material.color.set("#ba4f2f");
      } else if (objective.controller === "defender") {
        material.color.set("#2f566a");
      } else {
        material.color.set("#6f6a5e");
      }
      mesh.scale.set(1 + Math.abs(objective.progress) * 0.004, 1, 1 + Math.abs(objective.progress) * 0.004);
    }

    for (let i = 0; i < this.selectionRingPool.length; i += 1) {
      const ring = this.selectionRingPool[i];
      if (!ring) {
        continue;
      }
      const id = selectedUnitIds[i];
      if (id === undefined) {
        ring.visible = false;
        continue;
      }
      const selectedMesh = this.unitMeshes.get(id);
      if (selectedMesh) {
        ring.visible = true;
        ring.position.set(selectedMesh.position.x, 0.08, selectedMesh.position.z);
      } else {
        ring.visible = false;
      }
    }

    if (this.orderDragActive) {
      this.updateCommandLineVisual();
    }
  }

  render(): void {
    this.portalVisuals.animate(performance.now());
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearObstacles();
    this.clearOrderDrag();
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    this.portalVisuals.dispose();
    this.gridHelper.geometry.dispose();
    const gridMat = this.gridHelper.material;
    if (Array.isArray(gridMat)) {
      for (const m of gridMat) {
        m.dispose();
      }
    } else {
      gridMat.dispose();
    }
    this.hideMarquee();
    if (this.marqueeDiv.parentNode) {
      this.marqueeDiv.parentNode.removeChild(this.marqueeDiv);
    }
    this.selectionRingGeometry.dispose();
    this.selectionRingMaterial.dispose();
    this.commandLineGeometry.dispose();
    (this.commandLine.material as THREE.Material).dispose();
    this.scene.remove(this.commandLine);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    for (const mesh of this.unitMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const mesh of this.objectiveMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
