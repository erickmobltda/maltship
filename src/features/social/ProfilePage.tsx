import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Avatar } from '@/components/Avatar';
import { DemoBanner } from '@/components/DemoBanner';
import { ItemCard } from '@/components/ItemCard';
import { useCatalog } from '@/lib/catalog';
import type { OwnedItem, WishItem } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { useList } from '@/features/collection/useCollection';
import { useUserRatings } from '@/features/ratings/useRatings';
import { RatingCard } from '@/features/ratings/RatingCard';
import { useAvatar, useFollowCounts, useHandleUid, useIsFollowing, useProfile, useToggleFollow } from './useSocial';

function Items({ uid, list, publicOnly }: { uid: string; list: 'owned' | 'wishlist'; publicOnly: boolean }) {
  const { t } = useTranslation();
  const { data: catalog } = useCatalog();
  const res = useList<OwnedItem | WishItem>(uid, list, publicOnly);
  if (res.loading) return <Skeleton className="h-24 rounded-xl" />;
  if (!res.data.length) return <p className="text-sm text-muted-foreground">{t('profile.nothingHere')}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {res.data.map((x) => {
        const item = catalog?.get(x.itemId);
        return item ? <ItemCard key={x.id} item={item} /> : null;
      })}
    </div>
  );
}

export function ProfilePage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const { user, isDemo } = useAuth();
  const uidQuery = useHandleUid(isDemo ? undefined : handle);
  const uid = uidQuery.data ?? undefined;
  const { data: profile, loading } = useProfile(uid);
  const counts = useFollowCounts(uid);
  const following = useIsFollowing(user?.uid, uid);
  const toggleFollow = useToggleFollow();
  const ratings = useUserRatings(uid);
  const avatar = useAvatar(isDemo ? undefined : uid);
  const [zoom, setZoom] = React.useState(false);

  if (isDemo) return <DemoBanner />;
  if (uidQuery.isLoading || loading) return <Skeleton className="h-40 rounded-xl" />;
  if (!uid || !profile) return <p className="py-16 text-center text-muted-foreground">{t('profile.notFound')}</p>;

  const me = user?.uid === uid;
  // My own lists are always visible to me; others see only what I show.
  const showOwned = me || profile.showCollection;
  const showWish = me || profile.showWishlist;
  const follow = async () => {
    try {
      await toggleFollow(user!.uid, uid, !following);
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-4">
          {avatar ? (
            <button type="button" onClick={() => setZoom(true)} aria-label={t('profile.zoomPhoto', { name: profile.displayName })} className="shrink-0 cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar name={profile.displayName} image={avatar} />
            </button>
          ) : (
            <Avatar name={profile.displayName} />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            {profile.bio ? <p className="mt-2 whitespace-pre-line break-words text-sm">{profile.bio}</p> : null}
            <div className="mt-3 flex gap-4 text-sm">
              <Link to={`/u/${profile.handle}/followers`} className="hover:text-primary">
                <b>{counts.data?.followers ?? '–'}</b> <span className="text-muted-foreground">{t('profile.followers')}</span>
              </Link>
              <Link to={`/u/${profile.handle}/following`} className="hover:text-primary">
                <b>{counts.data?.following ?? '–'}</b> <span className="text-muted-foreground">{t('profile.following')}</span>
              </Link>
            </div>
          </div>
          {me ? (
            <Button asChild variant="outline" size="icon" aria-label={t('settings.title')}>
              <Link to="/settings">
                <Settings />
              </Link>
            </Button>
          ) : (
            <Button variant={following ? 'outline' : 'default'} size="sm" onClick={follow}>
              {following ? t('profile.unfollow') : t('profile.follow')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={zoom && !!avatar} onOpenChange={setZoom}>
        <DialogContent>
          <DialogTitle className="pr-6 text-base">{profile.displayName}</DialogTitle>
          {avatar ? <img src={avatar} alt={t('profile.photoOf', { name: profile.displayName })} className="mx-auto w-full max-w-[512px] rounded-xl" /> : null}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="ratings">
        <TabsList className="w-full">
          <TabsTrigger value="ratings" className="flex-1">
            {t('profile.ratings')}
          </TabsTrigger>
          {showOwned ? (
            <TabsTrigger value="owned" className="flex-1">
              {t('niche:owned.title')}
            </TabsTrigger>
          ) : null}
          {showWish ? (
            <TabsTrigger value="wishlist" className="flex-1">
              {t('collection.wishlist')}
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="ratings" className="mt-4 space-y-3">
          {ratings.data.length ? ratings.data.map((r) => <RatingCard key={r.id} rating={r} showItem />) : <p className="text-sm text-muted-foreground">{t('profile.noRatings')}</p>}
        </TabsContent>
        {showOwned ? (
          <TabsContent value="owned" className="mt-4">
            <Items uid={uid} list="owned" publicOnly={!me} />
          </TabsContent>
        ) : null}
        {showWish ? (
          <TabsContent value="wishlist" className="mt-4">
            <Items uid={uid} list="wishlist" publicOnly={!me} />
          </TabsContent>
        ) : null}
      </Tabs>
      {me && !profile.showCollection ? <p className="text-xs text-muted-foreground">{t('niche:owned.hiddenNote')}</p> : null}
    </div>
  );
}
