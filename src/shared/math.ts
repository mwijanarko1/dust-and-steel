import type { Vector2 } from "@/shared/types";

export function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalize(a: Vector2, b: Vector2): Vector2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  return { x: dx / length, z: dz / length };
}

export function moveTowards(current: Vector2, target: Vector2, maxDistance: number): Vector2 {
  const d = distance(current, target);
  if (d <= maxDistance || d === 0) {
    return { x: target.x, z: target.z };
  }
  const ratio = maxDistance / d;
  return {
    x: current.x + (target.x - current.x) * ratio,
    z: current.z + (target.z - current.z) * ratio
  };
}
