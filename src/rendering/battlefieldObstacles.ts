import * as THREE from "three";
import type { ObstacleVisual, ObstacleVisualKind } from "@/shared/types";

function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          m.dispose();
        }
      } else {
        mat.dispose();
      }
    }
  });
}

function boxMesh(w: number, h: number, d: number, color: string, roughness = 0.88, metalness = 0.04): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildLowWallLimestone(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const h = 2.4;
  const main = boxMesh(o.width * 0.92, h, Math.max(1.6, o.depth * 0.85), "#c9b896", 0.9, 0.02);
  main.position.y = h * 0.5;
  g.add(main);
  const cap = boxMesh(o.width * 0.95, 0.35, Math.max(1.8, o.depth), "#a89878", 0.82, 0.06);
  cap.position.y = h + 0.18;
  g.add(cap);
  return g;
}

function buildTreeClusterScrub(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const trunkColor = "#5c4a38";
  const canopyColor = "#3d5c3a";
  const rng = (i: number) => Math.sin(i * 12.9898 + o.center.x * 0.1 + o.center.z * 0.07) * 43758.5453;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = rng(i) - Math.floor(rng(i));
    const u = rng(i + 17) - Math.floor(rng(i + 17));
    const x = (t - 0.5) * o.width * 0.85;
    const z = (u - 0.5) * o.depth * 0.85;
    const h = 2.8 + (rng(i + 3) - Math.floor(rng(i + 3))) * 1.4;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, h, 8),
      new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.92, metalness: 0 })
    );
    trunk.position.set(x, h * 0.5, z);
    trunk.castShadow = true;
    g.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.1 + (rng(i + 9) - Math.floor(rng(i + 9))) * 0.5, 10, 8),
      new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.95, metalness: 0 })
    );
    canopy.position.set(x, h + 0.4, z);
    canopy.scale.set(1.15, 0.75, 1.15);
    canopy.castShadow = true;
    g.add(canopy);
  }
  return g;
}

function buildRubblePile(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const colors = ["#8a8274", "#7a7268", "#6f6a5e"];
  const rng = (i: number) => Math.sin(i * 78.233 + o.center.x + o.center.z) * 43758.5453;
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = rng(i) - Math.floor(rng(i));
    const u = rng(i + 5) - Math.floor(rng(i + 5));
    const w = 1.2 + t * 2.2;
    const h = 0.6 + u * 1.4;
    const d = 1 + ((rng(i + 11) - Math.floor(rng(i + 11))) * 1.8);
    const mesh = boxMesh(w, h, d, colors[i % colors.length]!, 0.94, 0.02);
    mesh.position.set(
      ((rng(i + 2) - Math.floor(rng(i + 2))) - 0.5) * o.width * 0.45,
      h * 0.5,
      ((rng(i + 4) - Math.floor(rng(i + 4))) - 0.5) * o.depth * 0.45
    );
    mesh.rotation.y = (rng(i + 8) - Math.floor(rng(i + 8))) * Math.PI;
    g.add(mesh);
  }
  return g;
}

function buildSplitRailFence(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const rail = "#6b5344";
  const postW = 0.45;
  const segments = 5;
  const span = o.width / segments;
  for (let i = 0; i <= segments; i++) {
    const x = -o.width * 0.5 + i * span;
    const post = boxMesh(postW, 2.2, postW, rail, 0.85, 0.02);
    post.position.set(x, 1.1, 0);
    g.add(post);
  }
  for (let i = 0; i < segments; i++) {
    const x = -o.width * 0.5 + i * span + span * 0.5;
    const zOff = i % 2 === 0 ? -0.25 : 0.25;
    const railH = boxMesh(span * 0.92, 0.22, 0.35, rail, 0.8, 0.02);
    railH.position.set(x, 1.35, zOff);
    railH.rotation.z = i % 2 === 0 ? 0.06 : -0.06;
    g.add(railH);
    const railL = boxMesh(span * 0.92, 0.22, 0.35, rail, 0.8, 0.02);
    railL.position.set(x, 0.75, -zOff);
    railL.rotation.z = i % 2 === 0 ? -0.05 : 0.05;
    g.add(railL);
  }
  return g;
}

function buildBermEarthwork(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const h = 3.2;
  const berm = boxMesh(o.width, h, Math.max(4, o.depth), "#6a5644", 0.96, 0.02);
  berm.position.y = h * 0.35;
  berm.scale.set(1, 0.55, 1);
  g.add(berm);
  const grass = boxMesh(o.width * 1.02, 0.4, Math.max(4.2, o.depth) * 1.02, "#4a5c38", 0.98, 0);
  grass.position.y = h * 0.62;
  g.add(grass);
  return g;
}

function buildTimberCrates(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const wood = "#7a5c3a";
  const c1 = boxMesh(o.width * 0.42, 1.8, o.depth * 0.55, wood, 0.88, 0.03);
  c1.position.set(-o.width * 0.12, 0.9, 0);
  g.add(c1);
  const c2 = boxMesh(o.width * 0.38, 1.4, o.depth * 0.5, "#6b4f32", 0.9, 0.03);
  c2.position.set(o.width * 0.18, 1.15, o.depth * 0.12);
  g.add(c2);
  const c3 = boxMesh(o.width * 0.35, 0.9, o.depth * 0.45, wood, 0.86, 0.03);
  c3.position.set(o.width * 0.05, 0.45, -o.depth * 0.18);
  g.add(c3);
  return g;
}

function buildJerseyBarrier(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const concrete = "#9a9590";
  const w = Math.max(4, o.width);
  const base = boxMesh(w * 0.95, 1.15, 1.25, concrete, 0.78, 0.08);
  base.position.set(0, 0.58, 0);
  g.add(base);
  const top = boxMesh(w * 0.88, 0.85, 0.95, "#a8a39e", 0.72, 0.1);
  top.position.set(0, 1.35, -0.08);
  top.rotation.x = -0.12;
  g.add(top);
  return g;
}

function buildSandbagLine(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const bag = "#8a7a5c";
  const count = Math.max(5, Math.floor(o.width / 2.2));
  const step = o.width / count;
  for (let i = 0; i < count; i++) {
    const x = -o.width * 0.5 + step * (i + 0.5);
    const mesh = boxMesh(1.9, 0.75, 0.95, bag, 0.92, 0.02);
    mesh.position.set(x, 0.38, (i % 2) * 0.15);
    mesh.rotation.y = i % 2 === 0 ? 0.04 : -0.04;
    g.add(mesh);
    const mesh2 = boxMesh(1.7, 0.55, 0.85, "#7a6b52", 0.93, 0.02);
    mesh2.position.set(x + 0.35, 0.95, -0.12);
    g.add(mesh2);
  }
  return g;
}

function buildBurnedVehicle(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const burnt = "#2a2420";
  const rust = "#4a3528";
  const body = boxMesh(o.width * 0.55, 1.4, o.depth * 0.42, burnt, 0.75, 0.2);
  body.position.set(0, 0.85, 0);
  g.add(body);
  const cabin = boxMesh(o.width * 0.35, 1.1, o.depth * 0.38, rust, 0.7, 0.25);
  cabin.position.set(-o.width * 0.2, 1.25, 0);
  g.add(cabin);
  const hood = boxMesh(o.width * 0.28, 0.55, o.depth * 0.4, "#1a1816", 0.82, 0.15);
  hood.position.set(o.width * 0.22, 0.65, 0.05);
  hood.rotation.z = 0.15;
  g.add(hood);
  return g;
}

function buildHescoBastion(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const fill = "#b8a878";
  const cage = "#6a6a62";
  const coreH = Math.max(3.5, o.depth * 0.4);
  const core = boxMesh(o.width * 0.88, coreH, o.depth * 0.88, fill, 0.95, 0.02);
  core.position.y = coreH * 0.5;
  g.add(core);
  const frame = boxMesh(o.width * 0.94, 0.15, o.depth * 0.94, cage, 0.65, 0.35);
  frame.position.y = 0.08;
  g.add(frame);
  const frameTop = boxMesh(o.width * 0.94, 0.12, o.depth * 0.94, cage, 0.65, 0.35);
  frameTop.position.y = coreH - 0.06;
  g.add(frameTop);
  return g;
}

function buildConcreteSpill(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const c = "#8c8984";
  const a = boxMesh(o.width * 0.55, 2.8, o.depth * 0.45, c, 0.72, 0.06);
  a.position.set(-o.width * 0.12, 1.4, 0);
  a.rotation.z = 0.04;
  g.add(a);
  const b = boxMesh(o.width * 0.42, 1.6, o.depth * 0.55, "#7a7772", 0.74, 0.05);
  b.position.set(o.width * 0.2, 0.8, o.depth * 0.1);
  b.rotation.y = 0.35;
  g.add(b);
  const slab = boxMesh(o.width * 0.7, 0.35, o.depth * 0.75, "#9a9690", 0.8, 0.04);
  slab.position.set(0, 0.18, 0);
  g.add(slab);
  return g;
}

/** Curtain wall and towers facing the battlefield (defender / +Z edge). */
function buildBackdropCastle(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const stone = "#9a8a72";
  const dark = "#6e6254";
  const span = o.width * 0.96;
  const baseDepth = Math.max(5, o.depth * 0.85);
  const wallH = 16;
  const curtain = boxMesh(span, wallH, baseDepth, stone, 0.88, 0.04);
  curtain.position.set(0, wallH * 0.5, 0);
  g.add(curtain);
  const towerW = Math.min(9, span * 0.09);
  const towerH = wallH + 6;
  const towerL = boxMesh(towerW, towerH, towerW * 1.05, dark, 0.86, 0.06);
  towerL.position.set(-span * 0.5 + towerW * 0.5, towerH * 0.5, -baseDepth * 0.08);
  g.add(towerL);
  const towerR = boxMesh(towerW, towerH, towerW * 1.05, dark, 0.86, 0.06);
  towerR.position.set(span * 0.5 - towerW * 0.5, towerH * 0.5, -baseDepth * 0.08);
  g.add(towerR);
  const gateW = span * 0.22;
  const gateOpening = boxMesh(gateW, wallH * 0.55, baseDepth * 1.1, "#4a4238", 0.92, 0.02);
  gateOpening.position.set(0, wallH * 0.32, baseDepth * 0.12);
  g.add(gateOpening);
  const merlons = 9;
  for (let i = 0; i < merlons; i += 1) {
    const mx = -span * 0.5 + (span / (merlons - 1)) * i;
    const m = boxMesh(span * 0.06, 1.2, baseDepth * 0.55, stone, 0.85, 0.03);
    m.position.set(mx, wallH + 0.6, 0);
    g.add(m);
  }
  return g;
}

/** Dense tropical jungle mass at map edge (clearing opens toward camera / -Z). */
function buildBackdropJungle(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const trunk = "#3d3028";
  const canopyDark = "#1a3d24";
  const canopyMid = "#2a5230";
  const rng = (i: number) => Math.sin(i * 91.345 + o.center.x * 0.02 + o.center.z * 0.03) * 43758.5453;
  const count = Math.min(38, Math.max(16, Math.floor((o.width * o.depth) / 95)));
  for (let i = 0; i < count; i += 1) {
    const t = rng(i) - Math.floor(rng(i));
    const u = rng(i + 31) - Math.floor(rng(i + 31));
    const x = (t - 0.5) * o.width * 0.92;
    const z = (u - 0.5) * o.depth * 0.92;
    const h = 6 + (rng(i + 7) - Math.floor(rng(i + 7))) * 7;
    const thick = 0.4 + (rng(i + 2) - Math.floor(rng(i + 2))) * 0.35;
    const trunkMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(thick * 0.85, thick * 1.1, h, 7),
      new THREE.MeshStandardMaterial({ color: trunk, roughness: 0.96, metalness: 0 })
    );
    trunkMesh.position.set(x, h * 0.5, z);
    trunkMesh.castShadow = true;
    g.add(trunkMesh);
    const layers = 2;
    for (let L = 0; L < layers; L += 1) {
      const col = L === 0 ? canopyMid : canopyDark;
      const rad = 2.2 + (rng(i + L * 13) - Math.floor(rng(i + L * 13))) * 2.4;
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(rad, 9, 7),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.98, metalness: 0 })
      );
      canopy.position.set(
        x + (L - 0.5) * 1.1,
        h + rad * 0.35 + L * 1.2,
        z + (rng(i + 50 + L) - Math.floor(rng(i + 50 + L))) * 1.5
      );
      canopy.scale.set(1.35, 0.65, 1.35);
      canopy.castShadow = true;
      g.add(canopy);
    }
  }
  return g;
}

/** Shallow decorative water band (XZ plane; use width × depth as span). */
function buildRiverShallow(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const w = Math.max(8, o.width);
  const d = Math.max(3, o.depth);
  const waterGeo = new THREE.PlaneGeometry(w, d, 1, 1);
  const waterMat = new THREE.MeshStandardMaterial({
    color: "#2d5a52",
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.06;
  g.add(water);
  const bank = "#5a5348";
  const bankN = boxMesh(w * 1.02, 0.35, 1.1, bank, 0.94, 0.02);
  bankN.position.set(0, 0.18, -d * 0.5);
  g.add(bankN);
  const bankS = boxMesh(w * 1.02, 0.35, 1.1, bank, 0.94, 0.02);
  bankS.position.set(0, 0.18, d * 0.5);
  g.add(bankS);
  return g;
}

function buildRockCluster(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const colors = ["#6a6560", "#5c5854", "#7a7268"];
  const rng = (i: number) => Math.sin(i * 55.123 + o.center.x * 0.08 + o.center.z * 0.06) * 43758.5453;
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    const t = rng(i) - Math.floor(rng(i));
    const u = rng(i + 4) - Math.floor(rng(i + 4));
    const w = 1.4 + t * 3.2;
    const h = 0.9 + u * 2.8;
    const dz = 1.2 + ((rng(i + 9) - Math.floor(rng(i + 9))) * 2.4);
    const mesh = boxMesh(w, h, dz, colors[i % colors.length]!, 0.9, 0.05);
    mesh.position.set(
      ((rng(i + 1) - Math.floor(rng(i + 1))) - 0.5) * o.width * 0.42,
      h * 0.45,
      ((rng(i + 3) - Math.floor(rng(i + 3))) - 0.5) * o.depth * 0.42
    );
    mesh.rotation.y = (rng(i + 6) - Math.floor(rng(i + 6))) * Math.PI;
    mesh.rotation.z = ((rng(i + 8) - Math.floor(rng(i + 8))) - 0.5) * 0.25;
    g.add(mesh);
  }
  return g;
}

/** Broken skyline and rubble — destroyed urban blocks at map edge. */
function buildBackdropUrbanRuins(o: ObstacleVisual): THREE.Group {
  const g = new THREE.Group();
  const concrete = "#6a6866";
  const dark = "#454340";
  const rng = (i: number) => Math.sin(i * 44.771 + o.center.x + o.center.z * 0.5) * 43758.5453;
  const shells = 11;
  for (let i = 0; i < shells; i += 1) {
    const t = rng(i) - Math.floor(rng(i));
    const x = (t - 0.5) * o.width * 0.88;
    const fw = 4 + (rng(i + 3) - Math.floor(rng(i + 3))) * 7;
    const fh = 8 + (rng(i + 5) - Math.floor(rng(i + 5))) * 22;
    const fd = 4 + (rng(i + 7) - Math.floor(rng(i + 7))) * 5;
    const shell = boxMesh(fw, fh, fd, i % 3 === 0 ? dark : concrete, 0.82, 0.08);
    shell.position.set(x, fh * 0.5, (rng(i + 11) - Math.floor(rng(i + 11)) - 0.5) * o.depth * 0.5);
    shell.rotation.z = ((rng(i + 13) - Math.floor(rng(i + 13))) - 0.5) * 0.12;
    g.add(shell);
    if (i % 2 === 0) {
      const stump = boxMesh(fw * 0.7, fh * 0.35, fd * 0.9, "#3a3836", 0.88, 0.1);
      stump.position.set(x + fw * 0.15, fh * 0.85, shell.position.z);
      stump.rotation.y = (rng(i + 17) - Math.floor(rng(i + 17))) * 0.4;
      g.add(stump);
    }
  }
  const rubble = buildRubblePile({
    ...o,
    width: o.width * 0.55,
    depth: o.depth * 0.65,
    center: { x: 0, z: 0 }
  });
  rubble.position.set(0, 0, o.depth * 0.25);
  g.add(rubble);
  return g;
}

const builders: Record<ObstacleVisualKind, (o: ObstacleVisual) => THREE.Group> = {
  low_wall_limestone: buildLowWallLimestone,
  tree_cluster_scrub: buildTreeClusterScrub,
  rubble_pile: buildRubblePile,
  split_rail_fence: buildSplitRailFence,
  berm_earthwork: buildBermEarthwork,
  timber_crates: buildTimberCrates,
  jersey_barrier: buildJerseyBarrier,
  sandbag_line: buildSandbagLine,
  burned_vehicle: buildBurnedVehicle,
  hesco_bastion: buildHescoBastion,
  concrete_spill: buildConcreteSpill,
  backdrop_castle: buildBackdropCastle,
  backdrop_jungle: buildBackdropJungle,
  river_shallow: buildRiverShallow,
  rock_cluster: buildRockCluster,
  backdrop_urban_ruins: buildBackdropUrbanRuins
};

/** Root group is positioned at obstacle center on XZ; Y up from ground. */
export function createObstacleRoot(obstacle: ObstacleVisual): THREE.Group {
  const build = builders[obstacle.kind];
  const root = new THREE.Group();
  const inner = build(obstacle);
  root.add(inner);
  root.rotation.y = obstacle.rotationY;
  return root;
}

export function disposeObstacleRoot(root: THREE.Object3D): void {
  disposeObject(root);
}
