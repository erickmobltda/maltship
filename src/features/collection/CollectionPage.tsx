import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ItemCard } from '@/components/ItemCard';
import { NO_FILTERS, search, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { niche } from '@/niche/config';
import type { OwnedItem, WithId } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateProfile } from '@/features/social/useSocial';
import { useUserRatings } from '@/features/ratings/useRatings';
import { formatDay, RatingCard } from '@/features/ratings/RatingCard';
import { CollectionSummary } from './CollectionSummary';
import { setOwnedExtra, useMyLists, useRemoved } from './useCollection';

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Owned-item extras from the niche config (e.g. a sealed/open status). */
function Extras({ item }: { item: WithId<OwnedItem> }) {
  const { t } = useTranslation();
  const set = (key: string, value: string | boolean) => setOwnedExtra(item, key, value).catch(() => toast.error(t('common.error')));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.preventDefault()}>
      {niche.owned.extras?.map((x) =>
        x.type === 'boolean' ? (
          <label key={x.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={!!item.extra?.[x.key]} onChange={(v) => void set(x.key, v)} label={t(`niche:extra.${x.key}.label`)} />
            {t(`niche:extra.${x.key}.label`)}
          </label>
        ) : (
          x.values?.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={item.extra?.[x.key] === v}
              onClick={() => void set(x.key, v)}
              className={cn('rounded-full border px-2.5 py-1 text-[11px]', item.extra?.[x.key] === v ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground')}
            >
              {t(`niche:extra.${x.key}.${v}`)}
            </button>
          ))
        ),
      )}
    </div>
  );
}

export function CollectionPage() {
  const { t, i18n } = useTranslation();
  const { user, isDemo, profile } = useAuth();
  const { data: catalog } = useCatalog();
  const { owned, wishlist } = useMyLists();
  const removed = useRemoved(user?.uid);
  const rated = useUserRatings(user?.uid, true);
  const [text, setText] = React.useState('');

  const matches = ({ itemId }: { itemId: string }) => {
    if (!text.trim()) return true;
    const item = catalog?.get(itemId);
    return !!item && search([item], { ...NO_FILTERS, text }).length > 0;
  };
  const shownOwned = owned.data.filter(matches);
  const shownWishlist = wishlist.data.filter(matches);
  const shownRated = rated.data.filter(matches);
  const noResults = <Empty>{t('collection.noResults')}</Empty>;

  const privacy = async (changes: { showCollection?: boolean; showWishlist?: boolean }) => {
    if (!profile) return;
    try {
      await updateProfile(profile, changes);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const gone = <p className="rounded-xl border p-3 text-xs text-muted-foreground">{t('item.gone')}</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{t('niche:owned.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('niche:owned.subtitle')}</p>
        {profile ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>{t('collection.visibleOnProfile')}</span>
            <span className="flex items-center gap-2">
              <Switch checked={profile.showCollection} onChange={(v) => void privacy({ showCollection: v })} label={t('niche:owned.showOnProfile')} />
              {t('niche:owned.title')}
            </span>
            <span className="flex items-center gap-2">
              <Switch checked={profile.showWishlist} onChange={(v) => void privacy({ showWishlist: v })} label={t('collection.showWishlist')} />
              {t('collection.wishlist')}
            </span>
          </div>
        ) : null}
      </div>

      {catalog && owned.data.length + removed.data.length > 0 ? <CollectionSummary owned={owned.data} removed={removed.data} ratings={rated.data} catalog={catalog} /> : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('niche:owned.searchPlaceholder')}
          aria-label={t('collection.search')}
          className="h-11 w-full rounded-xl border bg-card pl-9 pr-9 text-sm outline-none focus:border-primary"
          type="text"
          enterKeyHint="search"
        />
        {text ? (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setText('')} aria-label={t('common.clear')}>
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Tabs defaultValue="owned">
        <TabsList className="w-full">
          <TabsTrigger value="owned" className="flex-1">
            {t('niche:owned.title')} ({shownOwned.length})
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex-1">
            {t('collection.wishlist')} ({shownWishlist.length})
          </TabsTrigger>
          <TabsTrigger value="rated" className="flex-1">
            {t('collection.rated')} ({shownRated.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="mt-4 space-y-3">
          {owned.loading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : owned.data.length === 0 ? (
            <Empty>
              {t('niche:owned.empty')}{' '}
              <Link to="/" className="text-primary underline">
                {t('nav.discover')}
              </Link>
            </Empty>
          ) : shownOwned.length === 0 ? (
            noResults
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shownOwned.map((o) => {
                const item = catalog?.get(o.itemId);
                if (!item) return <div key={o.id}>{gone}</div>;
                return (
                  <ItemCard
                    key={o.id}
                    item={item}
                    extra={
                      <>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {niche.owned.quantity ? `${t('niche:owned.inList', { count: o.quantity })} · ` : ''}
                          {t('collection.since', { date: formatDay(o.addedAt.slice(0, 10), i18n.language) })}
                        </div>
                        {niche.owned.extras?.length ? <Extras item={o} /> : null}
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wishlist" className="mt-4">
          {wishlist.data.length === 0 ? (
            <Empty>{t('collection.wishlistEmpty')}</Empty>
          ) : shownWishlist.length === 0 ? (
            noResults
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shownWishlist.map((w) => {
                const item = catalog?.get(w.itemId);
                return item ? <ItemCard key={w.id} item={item} /> : <div key={w.id}>{gone}</div>;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rated" className="mt-4 space-y-3">
          {rated.data.length === 0 ? <Empty>{t('collection.ratedEmpty')}</Empty> : shownRated.length === 0 ? noResults : shownRated.map((r) => <RatingCard key={r.id} rating={r} showItem />)}
        </TabsContent>
      </Tabs>
      {isDemo ? <p className="text-xs text-muted-foreground">{t('demo.collectionNote')}</p> : null}
    </div>
  );
}
