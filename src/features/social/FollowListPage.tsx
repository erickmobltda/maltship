import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollows, useHandleUid, useProfiles } from './useSocial';
import { PersonRow } from './PeoplePage';

/** /u/:handle/followers and /u/:handle/following */
export function FollowListPage({ kind }: { kind: 'followers' | 'following' }) {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useHandleUid(handle).data ?? undefined;
  const follows = useFollows(kind === 'followers' ? 'followee' : 'follower', uid);
  const uids = follows.data.map((f) => (kind === 'followers' ? f.follower : f.followee));
  const profiles = useProfiles(uids);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-semibold">
        <Link to={`/u/${handle}`} className="hover:text-primary">
          @{handle}
        </Link>{' '}
        · {t(`profile.${kind}`)}
      </h1>
      {follows.loading || profiles.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !uids.length ? (
        <p className="text-sm text-muted-foreground">{t('profile.nothingHere')}</p>
      ) : (
        <div className="space-y-2">
          {uids.map((u) => {
            const p = profiles.data?.get(u);
            return p ? <PersonRow key={u} profile={p} /> : null;
          })}
        </div>
      )}
    </div>
  );
}
