const AVATAR_COLORS = [
  '#6B8E7A',
  '#8A7B9E',
  '#9E8467',
  '#67849E',
  '#9E6767',
  '#5F8A8A',
  '#8A855F',
  '#7A6B8E',
];

/** Deterministic, calm avatar background derived from a name/id. */
export function colorFromString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}
