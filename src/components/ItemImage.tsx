import * as React from 'react';
import { imageUrl, type Item } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { niche } from '@/niche/config';
import { Placeholder } from '@/niche/Placeholder';

export function ItemImage({ item, className }: { item: Pick<Item, 'image' | 'name'>; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const src = imageUrl(item);
  return (
    <div
      className={cn('flex w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-muted/60 to-muted/20', className)}
      style={{ aspectRatio: niche.image.aspect }}
    >
      {src && !failed ? (
        <img src={src} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <Placeholder />
      )}
    </div>
  );
}
