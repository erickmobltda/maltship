import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ItemCard } from '@/components/ItemCard';
import { useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { niche } from '@/niche/config';
import type { OwnedItem, WithId } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateProfile } from '@/features/social/useSocial';
import { useUserRatings } from '@/features/ratings/useRatings';
import { formatDay, RatingCard } from '@/features/ratings/RatingCard';
import { setOwnedExtra, useMyLists } from './useCollection';

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Owned-item extras from the niche config (e.g. whisky sealed/open). */
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
  const rated = useUserRatings(user?.uid);

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
      </div>

      {profile ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('niche:owned.showOnProfile')}
            <Switch checked={profile.showCollection} onChange={(v) => void privacy({ showCollection: v })} label={t('niche:owned.showOnProfile')} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('collection.showWishlist')}
            <Switch checked={profile.showWishlist} onChange={(v) => void privacy({ showWishlist: v })} label={t('collection.showWishlist')} />
          </label>
        </div>
      ) : null}

      <Tabs defaultValue="owned">
        <TabsList className="w-full">
          <TabsTrigger value="owned" className="flex-1">
            {t('niche:owned.title')} ({owned.data.length})
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex-1">
            {t('collection.wishlist')} ({wishlist.data.length})
          </TabsTrigger>
          <TabsTrigger value="rated" className="flex-1">
            {t('collection.rated')} ({rated.data.length})
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {owned.data.map((o) => {
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {wishlist.data.map((w) => {
                const item = catalog?.get(w.itemId);
                return item ? <ItemCard key={w.id} item={item} /> : <div key={w.id}>{gone}</div>;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rated" className="mt-4 space-y-3">
          {rated.data.length === 0 ? <Empty>{t('collection.ratedEmpty')}</Empty> : rated.data.map((r) => <RatingCard key={r.id} rating={r} showItem />)}
        </TabsContent>
      </Tabs>
      {isDemo ? <p className="text-xs text-muted-foreground">{t('demo.collectionNote')}</p> : null}
    </div>
  );
}
