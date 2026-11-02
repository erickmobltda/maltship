import { cn } from '@/lib/utils';

/** A profile picture, or the first letter of the name when there is none. */
export function Avatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  return (
    <span className={cn('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-display text-2xl font-semibold text-primary', className)}>
      {image ? <img src={image} alt="" className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
