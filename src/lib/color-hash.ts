const PALETTE = [
  { bg: "#ffe9d1", fg: "#8a4b06" },
  { bg: "#e4e7f5", fg: "#39406b" },
  { bg: "#dcefe6", fg: "#1f6b4c" },
  { bg: "#fce4e8", fg: "#9c2e44" },
  { bg: "#e0f0fb", fg: "#1f5a86" },
  { bg: "#f1e6fb", fg: "#6b3aa0" },
  { bg: "#fbeed1", fg: "#8a6d06" },
  { bg: "#e6edee", fg: "#3a4d52" },
];

export function hashColor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
