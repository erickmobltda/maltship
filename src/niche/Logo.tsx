import { cn } from '@/lib/utils';

/** Maltship mark: a Glencairn glass with a dram in it. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-7', className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="hsl(var(--card))" />
      <path d="M24 12h16c0 8 6 12 6 22a14 14 0 0 1-28 0c0-10 6-14 6-22Z" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19.5 36h25a12.5 12.5 0 0 1-25 0Z" fill="hsl(var(--primary))" />
      <rect x="22" y="50" width="20" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" />
    </svg>
  );
}
