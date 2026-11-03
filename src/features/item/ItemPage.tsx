import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, Minus, Plus, Archive, PenLine } from 'lucide-react';
import { imageUrl, useCatalog } from '@/lib/catalog';
import { niche } from '@/niche/config';
import { ItemImage } from '@/components/ItemImage';
import { InfiniteList } from '@/components/InfiniteList';
import { useAttrText } from '@/components/AttrText';
import { Stars } from '@/components/Stars';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { setOwned, setWished, useMyLists } from '@/features/collection/useCollection';
import { useItemRatings } from '@/features/ratings/useRatings';
import { RatingDialog } from '@/features/ratings/RatingDialog';
import { RatingCard } from '@/features/ratings/RatingCard';
import { cn } from '@/lib/utils';

function Spec({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm">{value}</div>
    </div>
  );
}

export function ItemPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const text = useAttrText();
  const navigate = useNavigate();
  const { user, isDemo, profile } = useAuth();
  const { data: catalog, isLoading } = useCatalog();
  const { owned, wishlist } = useMyLists();
  const ratings = useItemRatings(id);
  const [rateOpen, setRateOpen] = React.useState(false);
  const [askUnwish, setAskUnwish] = React.useState(false);

  const item = catalog?.get(id);
  const top = niche.image.layout === 'top';
  const mineOwned = owned.data.find((o) => o.itemId === id);
  const wished = wishlist.data.some((w) => w.itemId === id);
  const mine = user ? ratings.data.find((r) => r.uid === user.uid) : undefined;
  const avg = ratings.data.length ? ratings.data.reduce((s, r) => s + r.stars, 0) / ratings.data.length : 0;

  const needLogin = () => navigate('/login', { state: { from: `/item/${id}` } });
  // Social writes need a profile (the demo writes only its own data).
  const ready = () => {
    if (!user) return needLogin(), false;
    if (!isDemo && !profile) return navigate('/setup', { state: { from: `/item/${id}` } }), false;
    return true;
  };
  const run = async (fn: () => Promise<unknown>) => {
    if (!ready()) return;
    try {
      await fn();
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!item) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        {t('item.notFound')}{' '}
        <Link to="/" className="text-primary underline">
          {t('nav.discover')}
        </Link>
      </div>
    );
  }

  const addOwned = () =>
    run(async () => {
      await setOwned(user!.uid, id, 1);
      if (wished) setAskUnwish(true);
    });
  const subtitle = niche.attributes.filter((a) => a.subtitle).map((a) => text(a, item.attrs[a.key])).filter(Boolean).join(' · ');

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t('common.back')}
      </button>

      <div className="rounded-2xl border bg-card p-4 md:p-6">
        <div className={cn('flex gap-4', top && 'flex-col')}>
          <ItemImage item={item} className={top ? 'w-full' : 'w-28 shrink-0 md:w-40'} />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold md:text-3xl">{item.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user ? (
                <div
                  className="flex items-center gap-1.5"
                  title={ratings.data.length ? t('item.community', { avg: avg.toFixed(1), count: ratings.data.length }) : t('item.noCommunity')}
                >
                  <Stars value={Math.round(avg * 2) / 2} />
                  {ratings.data.length ? `${avg.toFixed(1)} (${ratings.data.length})` : '(0)'}
                  <span className="sr-only">{ratings.data.length ? t('item.community', { avg: avg.toFixed(1), count: ratings.data.length }) : t('item.noCommunity')}</span>
                </div>
              ) : null}
              {item.bestScore ? (
                <div
                  className="flex items-baseline gap-1.5"
                  title={[t('niche:scores.best'), Math.min(...item.scores) < item.bestScore && t('niche:scores.history', { count: item.scores.length, min: Math.min(...item.scores), max: item.bestScore })].filter(Boolean).join(' · ')}
                >
                  <span className="font-display font-semibold text-foreground">{item.bestScore}</span>
                  {t('niche:scores.badge')}
                  <span className="sr-only">{t('niche:scores.best')}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {item.imageCredit && imageUrl(item) ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {item.imageCredit.url ? (
              <a href={item.imageCredit.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {t('item.photoCredit', { author: item.imageCredit.author, license: item.imageCredit.license })}
              </a>
            ) : (
              t('item.photoCredit', { author: item.imageCredit.author, license: item.imageCredit.license })
            )}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={() => ready() && setRateOpen(true)}>
            <PenLine /> {mine ? t('item.editRating') : t('item.rate')}
          </Button>
          <Button variant="outline" className={cn(wished && 'border-primary text-primary')} onClick={() => run(() => setWished(user!.uid, id, !wished))}>
            <Heart className={cn(wished && 'fill-current')} /> {wished ? t('item.wished') : t('item.wish')}
          </Button>
          {mineOwned ? (
            niche.owned.quantity ? (
              <div className="flex min-h-10 items-center justify-between rounded-md border border-primary/40 px-2">
                <button className="p-2" aria-label={t('item.less')} onClick={() => run(() => setOwned(user!.uid, id, mineOwned.quantity - 1, mineOwned))}>
                  <Minus className="size-4" />
                </button>
                <span className="text-sm">
                  <Archive className="mr-1 inline size-4 text-primary" />
                  {t('niche:owned.inList', { count: mineOwned.quantity })}
                </span>
                <button
                  className="p-2 disabled:opacity-40"
                  aria-label={t('item.more')}
                  disabled={mineOwned.quantity >= niche.owned.maxQuantity}
                  onClick={() => run(() => setOwned(user!.uid, id, mineOwned.quantity + 1, mineOwned))}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : (
              <Button variant="outline" className="border-primary text-primary" onClick={() => run(() => setOwned(user!.uid, id, 0, mineOwned))}>
                <Archive /> {t('niche:owned.remove')}
              </Button>
            )
          ) : (
            <Button variant="outline" onClick={addOwned}>
              <Archive /> {t('niche:owned.add')}
            </Button>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t('item.specs')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {niche.attributes
            .filter((a) => a.showInSpecs)
            .map((a) => (
              <Spec key={a.key} label={t(`niche:attr.${a.key}`)} value={text(a, item.attrs[a.key])} />
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t('item.ratings')}</h2>
        {!user ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" state={{ from: `/item/${id}` }} className="text-primary underline">
              {t('auth.signIn')}
            </Link>{' '}
            {t('item.signInToSee')}
          </p>
        ) : ratings.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('item.noRatings')}</p>
        ) : (
          <InfiniteList items={ratings.data} className="space-y-3" renderItem={(r) => <RatingCard key={r.id} rating={r} />} />
        )}
      </section>

      <RatingDialog open={rateOpen} onOpenChange={setRateOpen} itemId={id} itemName={item.name} existing={mine} />

      <Dialog open={askUnwish} onOpenChange={setAskUnwish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('item.unwishTitle')}</DialogTitle>
            <DialogDescription>{t('item.unwishBody')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAskUnwish(false)}>
              {t('common.no')}
            </Button>
            <Button
              autoFocus
              onClick={() => {
                setAskUnwish(false);
                void run(() => setWished(user!.uid, id, false));
              }}
            >
              {t('common.yes')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
