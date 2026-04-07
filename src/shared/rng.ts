export interface RandomSource {
  float(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

function mulberry32(seed: number): () => number {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let t = Math.imul(current ^ (current >>> 15), 1 | current);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed: number): RandomSource {
  const next = mulberry32(seed);
  return {
    float() {
      return next();
    },
    int(minInclusive, maxInclusive) {
      const range = maxInclusive - minInclusive + 1;
      return minInclusive + Math.floor(next() * range);
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty collection");
      }
      return items[Math.floor(next() * items.length)] as T;
    }
  };
}
