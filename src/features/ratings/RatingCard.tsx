import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { Stars } from '@/components/Stars';
import { ItemCard } from '@/components/ItemCard';
import { toast } from '@/components/ui/toast';
import { useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLiked, useToggleLike } from '@/features/social/useSocial';
import type { Rating, WithId } from '@/lib/types';

export function formatDay(day: string, lang: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(y, m - 1, d));
}

/**
 * One rating: author, stars, tags, notes, date and a like button. `showItem` adds the item card (profiles, collection).
 * `split` is the feed's layout: the item on one half and the review, first its text, on the other.
 */
export function RatingCard({ rating, showItem, split }: { rating: WithId<Rating>; showItem?: boolean; split?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, isDemo } = useAuth();
  const { data: catalog } = useCatalog();
  const item = catalog?.get(rating.itemId);
  const mine = user?.uid === rating.uid;
  const canLike = !!user && !isDemo && !mine;
  const liked = useLiked(rating.id, user?.uid, !!user && !isDemo);
  const toggleLike = useToggleLike();

  const onLike = async () => {
    if (!user || !canLike) return;
    try {
      await toggleLike(rating.id, user.uid, !liked.data);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const author = (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
        {(rating.displayName || '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        {isDemo ? (
          <span className="block truncate text-sm font-medium">{rating.displayName}</span>
        ) : (
          <Link to={`/u/${rating.handle}`} className="block truncate text-sm font-medium hover:text-primary">
            {rating.displayName}
          </Link>
        )}
        <div className="flex gap-1 text-[11px] text-muted-foreground">
          <span className="truncate">@{rating.handle}</span>
          <span className="shrink-0">· {formatDay(rating.experiencedOn, i18n.language)}</span>
        </div>
      </div>
      {split ? null : <Stars value={rating.stars} />}
    </div>
  );
  const itemCard = item ? <ItemCard item={item} /> : <p className="text-xs text-muted-foreground">{t('item.gone')}</p>;
  const tags = rating.tags.length ? (
    <div className="mt-3 flex flex-wrap gap-1">
      {rating.tags.map((tag) => (
        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {t(`niche:tag.${tag}`, { defaultValue: tag })}
        </span>
      ))}
    </div>
  ) : null;
  const like = !isDemo ? (
    <div className="mt-auto flex justify-end pt-3">
      <button
        type="button"
        onClick={onLike}
        disabled={!canLike}
        aria-pressed={!!liked.data}
        aria-label={liked.data ? t('rating.unlike') : t('rating.like')}
        className={cn('flex min-h-9 items-center gap-1 rounded-full px-3 text-xs', liked.data ? 'text-primary' : 'text-muted-foreground', canLike && 'hover:text-foreground')}
      >
        <Heart className={cn('size-4', liked.data && 'fill-current')} />
        {rating.likeCount}
      </button>
    </div>
  ) : null;

  if (split) {
    return (
      <article className="grid min-w-0 gap-4 rounded-xl border bg-card p-4 animate-fade-in sm:grid-cols-2">
        <div className="min-w-0">{itemCard}</div>
        <div className="flex min-w-0 flex-col">
          {author}
          <div className="mt-3">
            <Stars value={rating.stars} />
          </div>
          {rating.notes ? <p className="mt-2whitespace-pre-line break-words text-sm">{rating.notes}</p> : null}
          {tags}
          {like}
        </div>
      </article>
    );
  }

  return (
    <article className="flex min-w-0 flex-col rounded-xl border bg-card p-4 animate-fade-in">
      {author}
      {showItem ? <div className="mt-3">{itemCard}</div> : null}
      {tags}
      {rating.notes ? <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{rating.notes}</p> : null}
      {like}
    </article>
  );
}
