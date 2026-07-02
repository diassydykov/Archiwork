/** Seeded PRNG (mulberry32) for reproducible-but-varied layouts */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

export function createRng(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(max: number): number {
      return Math.floor(this.next() * max);
    },
    float(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
    pick<T>(arr: T[]): T {
      return arr[this.int(arr.length)];
    },
    shuffle<T>(arr: T[]): T[] {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = this.int(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export function layoutGenerationSeed(
  projectKey: string,
  nonce?: string
): number {
  const salt = nonce ?? `${Date.now()}-${Math.random()}`;
  return hashSeed(`${projectKey}|${salt}`);
}
