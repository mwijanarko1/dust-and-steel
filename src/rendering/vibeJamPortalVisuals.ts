import * as THREE from "three";

export interface PortalCenters {
  exit: { x: number; z: number } | null;
  start: { x: number; z: number } | null;
}

function createLabelTexture(text: string, fillStyle: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 96;
  if (context) {
    context.fillStyle = fillStyle;
    context.font = "bold 36px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPortalGroup(
  color: number,
  emissive: number,
  labelText: string,
  labelColor: string
): {
  group: THREE.Group;
  particleGeometry: THREE.BufferGeometry;
  dispose: () => void;
} {
  const group = new THREE.Group();
  group.rotation.x = 0.35;

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(12, 1.6, 16, 64),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.88,
      roughness: 0.35,
      metalness: 0.15
    })
  );
  group.add(torus);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    })
  );
  inner.rotation.y = Math.PI / 2;
  group.add(inner);

  const labelTex = createLabelTexture(labelText, labelColor);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4.5),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide })
  );
  label.position.y = 16;
  group.add(label);

  const particleCount = 600;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  for (let i = 0; i < particleCount * 3; i += 3) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + (Math.random() - 0.5) * 3;
    positions[i] = Math.cos(angle) * radius;
    positions[i + 1] = Math.sin(angle) * radius;
    positions[i + 2] = (Math.random() - 0.5) * 3;
    colors[i] = nr * (0.75 + Math.random() * 0.25);
    colors[i + 1] = ng * (0.75 + Math.random() * 0.25);
    colors[i + 2] = nb * (0.75 + Math.random() * 0.25);
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  particleGeometry.userData["basePositions"] = new Float32Array(positions);
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.55 })
  );
  group.add(particles);

  const dispose = (): void => {
    torus.geometry.dispose();
    (torus.material as THREE.Material).dispose();
    inner.geometry.dispose();
    (inner.material as THREE.Material).dispose();
    label.geometry.dispose();
    (label.material as THREE.Material).dispose();
    labelTex.dispose();
    particleGeometry.dispose();
    (particles.material as THREE.Material).dispose();
  };

  return { group, particleGeometry, dispose };
}

export class VibeJamPortalVisuals {
  private readonly scene: THREE.Scene;
  private exitGroup: THREE.Group | null = null;
  private startGroup: THREE.Group | null = null;
  private exitParticles: THREE.BufferGeometry | null = null;
  private startParticles: THREE.BufferGeometry | null = null;
  private exitDispose: (() => void) | null = null;
  private startDispose: (() => void) | null = null;
  private lastCenters: PortalCenters = { exit: null, start: null };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  sync(centers: PortalCenters): void {
    const exitChanged = JSON.stringify(centers.exit) !== JSON.stringify(this.lastCenters.exit);
    const startChanged = JSON.stringify(centers.start) !== JSON.stringify(this.lastCenters.start);
    this.lastCenters = { exit: centers.exit, start: centers.start };

    if (exitChanged) {
      this.clearExit();
      if (centers.exit) {
        const { group, particleGeometry, dispose } = createPortalGroup(
          0x22c55e,
          0x166534,
          "Vibe Jam Portal",
          "#22c55e"
        );
        group.position.set(centers.exit.x, 7, centers.exit.z);
        group.rotation.y = -Math.PI / 2;
        this.scene.add(group);
        this.exitGroup = group;
        this.exitParticles = particleGeometry;
        this.exitDispose = dispose;
      }
    }

    if (startChanged) {
      this.clearStart();
      if (centers.start) {
        const { group, particleGeometry, dispose } = createPortalGroup(
          0xef4444,
          0x991b1b,
          "Return",
          "#ef4444"
        );
        group.position.set(centers.start.x, 7, centers.start.z);
        group.rotation.y = Math.PI / 2;
        this.scene.add(group);
        this.startGroup = group;
        this.startParticles = particleGeometry;
        this.startDispose = dispose;
      }
    }
  }

  animate(timeMs: number): void {
    const t = timeMs * 0.001;
    for (const geo of [this.exitParticles, this.startParticles]) {
      if (!geo) {
        continue;
      }
      const attr = geo.attributes.position;
      if (!attr) {
        continue;
      }
      const base = geo.userData["basePositions"] as Float32Array | undefined;
      const positions = attr.array as Float32Array;
      if (!base || base.length !== positions.length) {
        continue;
      }
      for (let i = 0; i < positions.length; i += 3) {
        const bi = base[i] ?? 0;
        const bi1 = base[i + 1] ?? 0;
        const bi2 = base[i + 2] ?? 0;
        positions[i] = bi;
        positions[i + 1] = bi1 + 0.04 * Math.sin(t * 2 + i * 0.01);
        positions[i + 2] = bi2;
      }
      attr.needsUpdate = true;
    }
  }

  private clearExit(): void {
    if (this.exitGroup) {
      this.scene.remove(this.exitGroup);
      this.exitDispose?.();
      this.exitGroup = null;
      this.exitParticles = null;
      this.exitDispose = null;
    }
  }

  private clearStart(): void {
    if (this.startGroup) {
      this.scene.remove(this.startGroup);
      this.startDispose?.();
      this.startGroup = null;
      this.startParticles = null;
      this.startDispose = null;
    }
  }

  dispose(): void {
    this.clearExit();
    this.clearStart();
  }
}
