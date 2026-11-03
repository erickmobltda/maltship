import { useTranslation } from 'react-i18next';
import { Archive, Heart, Star, type LucideIcon } from 'lucide-react';
import { avgStars, type ItemStats } from '@/lib/catalog';
import { cn } from '@/lib/utils';

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: string | number | null; label: string }) {
  return (
    <span className={cn('flex items-center gap-1', value === null && 'opacity-40')} title={label}>
      <Icon className="size-3.5" aria-hidden />
      <span aria-hidden>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** A missing count means "no data" (small ones are withheld for privacy), so it shows a dimmed icon, never a zero. */
export function ItemPopularity({ stats = {} }: { stats?: ItemStats }) {
  const { t } = useTranslation();
  const { owned, wished, ratings } = stats;
  const avg = avgStars(stats);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Stat
        icon={Star}
        value={ratings ? (avg ? `${avg.toFixed(1)} (${ratings})` : `(${ratings})`) : null}
        label={!ratings ? t('item.noCommunity') : avg ? t('item.community', { avg: avg.toFixed(1), count: ratings }) : t('popularity.ratings', { count: ratings })}
      />
      <Stat icon={Archive} value={owned ?? null} label={owned ? t('niche:owned.popularity', { count: owned }) : t('niche:owned.popularityNone')} />
      <Stat icon={Heart} value={wished ?? null} label={wished ? t('popularity.wished', { count: wished }) : t('popularity.noWished')} />
    </div>
  );
}
