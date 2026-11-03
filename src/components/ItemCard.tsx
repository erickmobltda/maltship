import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Item } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { niche } from '@/niche/config';
import { ItemImage } from './ItemImage';
import { useAttrText } from './AttrText';

export function ItemCard({ item, extra }: { item: Item; extra?: React.ReactNode }) {
  const { t } = useTranslation();
  const text = useAttrText();
  const top = niche.image.layout === 'top';
  const subtitle = niche.attributes.filter((a) => a.subtitle).map((a) => text(a, item.attrs[a.key])).filter(Boolean).join(' · ');
  return (
    <Link
      to={`/item/${item.id}`}
      className={cn(
        'group flex min-w-0 gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 animate-fade-in',
        top && 'flex-col',
      )}
    >
      <ItemImage item={item} className={top ? 'w-full' : 'w-16 shrink-0'} />
      <div className={cn('min-w-0 flex-1', !top && 'self-center')}>
        <div className="truncate font-medium group-hover:text-primary">{item.name}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
        {item.bestScore ? (
          <div className="mt-1 flex items-baseline gap-1.5 text-xs text-muted-foreground" title={t('niche:scores.best')}>
            <span className="font-display text-sm font-semibold text-foreground">{item.bestScore}</span>
            {t('niche:scores.badge')}
            <span className="sr-only">{t('niche:scores.best')}</span>
          </div>
        ) : null}
        {extra}
      </div>
    </Link>
  );
}
