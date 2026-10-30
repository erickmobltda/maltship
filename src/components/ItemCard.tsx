import { Link } from 'react-router-dom';
import type { Item } from '@/lib/catalog';
import { niche } from '@/niche/config';
import { ItemImage } from './ItemImage';
import { useAttrText } from './AttrText';

export function ItemCard({ item, extra }: { item: Item; extra?: React.ReactNode }) {
  const text = useAttrText();
  const subtitle = niche.attributes.filter((a) => a.subtitle).map((a) => text(a, item.attrs[a.key])).filter(Boolean).join(' · ');
  return (
    <Link to={`/item/${item.id}`} className="group flex min-w-0 gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 animate-fade-in">
      <ItemImage item={item} className="w-16 shrink-0" />
      <div className="min-w-0 flex-1 self-center">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium group-hover:text-primary">{item.name}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
          </div>
          {item.bestScore ? (
            <div className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-display text-lg font-semibold leading-none text-primary">{item.bestScore}</div>
          ) : null}
        </div>
        {extra}
      </div>
    </Link>
  );
}
