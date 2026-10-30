import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { DemoBanner } from '@/components/DemoBanner';
import type { Profile, WithId } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { searchPeople, useIsFollowing, useToggleFollow } from './useSocial';

export function PersonRow({ profile }: { profile: WithId<Profile> }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const following = useIsFollowing(user?.uid, profile.uid);
  const toggle = useToggleFollow();
  const me = user?.uid === profile.uid;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{profile.displayName.slice(0, 1).toUpperCase()}</div>
      <Link to={`/u/${profile.handle}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{profile.displayName}</div>
        <div className="truncate text-xs text-muted-foreground">@{profile.handle}</div>
      </Link>
      {!me && user ? (
        <Button
          size="sm"
          variant={following ? 'outline' : 'default'}
          onClick={() => toggle(user.uid, profile.uid, !following).catch(() => toast.error(t('common.error')))}
        >
          {following ? t('profile.unfollow') : t('profile.follow')}
        </Button>
      ) : null}
    </div>
  );
}

export function PeoplePage() {
  const { t } = useTranslation();
  const { isDemo } = useAuth();
  const [text, setText] = React.useState('');
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setQ(text), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useQuery({ queryKey: ['people', q], enabled: !isDemo && !!q.trim(), queryFn: () => searchPeople(q) });

  if (isDemo) return <DemoBanner />;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{t('people.title')}</h1>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('people.placeholder')}
          aria-label={t('people.title')}
          autoCapitalize="none"
          className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {results.data?.length ? (
        <div className="space-y-2">
          {results.data.map((p) => (
            <PersonRow key={p.id} profile={p} />
          ))}
        </div>
      ) : q.trim() && !results.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('people.empty')}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('people.hint')}</p>
      )}
    </div>
  );
}
