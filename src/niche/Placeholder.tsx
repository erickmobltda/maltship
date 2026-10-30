/** Shown when an item has no photo: a plain bottle, so the layout stays put. */
export function Placeholder() {
  return (
    <svg viewBox="0 0 60 80" className="h-3/4 opacity-40" aria-hidden>
      <rect x="25" y="4" width="10" height="12" rx="2" fill="hsl(var(--muted-foreground))" />
      <path d="M24 16h12v8c6 3 9 8 9 14v34a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V38c0-6 3-11 9-14Z" fill="hsl(var(--primary))" />
      <rect x="18" y="44" width="24" height="16" rx="2" fill="hsl(var(--card))" opacity="0.85" />
    </svg>
  );
}
