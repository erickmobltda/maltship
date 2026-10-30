import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DemoBanner } from '@/components/DemoBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEveryoneFeed, useFollowingFeed } from '@/features/ratings/useRatings';
import { RatingCard } from '@/features/ratings/RatingCard';
import type { Rating, WithId } from '@/lib/types';
import { useFollows } from './useSocial';

function List({ data, loading, empty }: { data: WithId<Rating>[]; loading: boolean; empty: React.ReactNode }) {
  if (loading && !data.length) return <Skeleton className="h-40 rounded-xl" />;
  if (!data.length) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="space-y-3">
      {data.map((r) => (
        <RatingCard key={r.id} rating={r} showItem />
      ))}
    </div>
  );
}

function FollowingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const follows = useFollows('follower', user?.uid);
  const feed = useFollowingFeed(follows.data.map((f) => f.followee));
  return (
    <>
      {feed.tooMany ? <p className="mb-3 text-xs text-muted-foreground">{t('feed.tooMany')}</p> : null}
      <List
        data={feed.data}
        loading={follows.loading || feed.loading}
        empty={
          <>
            {t('feed.followingEmpty')}{' '}
            <Link to="/people" className="text-primary underline">
              {t('people.title')}
            </Link>
          </>
        }
      />
    </>
  );
}

export function FeedPage() {
  const { t } = useTranslation();
  const { isDemo } = useAuth();
  const everyone = useEveryoneFeed();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">{t('feed.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('niche:feed.subtitle')}</p>
        </div>
        {!isDemo ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/people">
              <UserPlus /> {t('people.title')}
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo ? (
        <>
          <DemoBanner />
          <List data={everyone.data} loading={everyone.loading} empty={t('feed.empty')} />
        </>
      ) : (
        <Tabs defaultValue="following">
          <TabsList className="w-full">
            <TabsTrigger value="following" className="flex-1">
              {t('feed.following')}
            </TabsTrigger>
            <TabsTrigger value="everyone" className="flex-1">
              {t('feed.everyone')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="following" className="mt-4">
            <FollowingTab />
          </TabsContent>
          <TabsContent value="everyone" className="mt-4">
            <List data={everyone.data} loading={everyone.loading} empty={t('feed.empty')} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
