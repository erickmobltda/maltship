import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read-only 0-5 stars in half steps. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center text-primary', className)} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) =>
        value >= i ? (
          <Star key={i} className="size-4 fill-current" />
        ) : value >= i - 0.5 ? (
          <StarHalf key={i} className="size-4 fill-current" />
        ) : (
          <Star key={i} className="size-4 opacity-25" />
        ),
      )}
    </span>
  );
}

/** Tap a star once for a full star, again for a half. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const full = value >= i;
        const half = !full && value >= i - 0.5;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i}`}
            className="rounded-md p-1 text-primary transition-transform active:scale-90"
            onClick={() => onChange(value === i ? i - 0.5 : i)}
          >
            {half ? <StarHalf className="size-9 fill-current" /> : <Star className={cn('size-9', full ? 'fill-current' : 'opacity-30')} />}
          </button>
        );
      })}
    </div>
  );
}
