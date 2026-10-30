import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { DemoBanner } from '@/components/DemoBanner';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { MAX_BIO, MAX_NAME } from '@/lib/validation';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateProfile } from '@/features/social/useSocial';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, isDemo, profile } = useAuth();
  const [name, setName] = React.useState(profile?.displayName ?? '');
  const [bio, setBio] = React.useState(profile?.bio ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(profile?.displayName ?? '');
    setBio(profile?.bio ?? '');
  }, [profile?.displayName, profile?.bio]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile, { displayName: name.trim(), bio: bio.trim() });
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  const privacy = (changes: { showCollection?: boolean; showWishlist?: boolean }) =>
    profile && updateProfile(profile, changes).catch(() => toast.error(t('common.error')));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {isDemo ? <DemoBanner /> : null}

      {profile ? (
        <form onSubmit={save} className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          <div className="space-y-2">
            <Label htmlFor="name">{t('settings.displayName')}</Label>
            <Input id="name" value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t('settings.bio')}</Label>
            <textarea id="bio" value={bio} maxLength={MAX_BIO} rows={3} onChange={(e) => setBio(e.target.value)} className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:border-primary" />
          </div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </form>
      ) : null}

      {profile ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('settings.privacy')}</h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('niche:owned.showOnProfile')}
            <Switch checked={profile.showCollection} onChange={(v) => void privacy({ showCollection: v })} label={t('niche:owned.showOnProfile')} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('collection.showWishlist')}
            <Switch checked={profile.showWishlist} onChange={(v) => void privacy({ showWishlist: v })} label={t('collection.showWishlist')} />
          </label>
          <p className="text-xs text-muted-foreground">{t('settings.ratingsPublic')}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <span className="text-sm">{t('settings.language')}</span>
        <LanguageSwitch />
      </div>

      <Button variant="outline" className="w-full" onClick={() => signOut(auth)}>
        <LogOut /> {t('settings.signOut')}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t('niche:credits')}</p>
    </div>
  );
}
