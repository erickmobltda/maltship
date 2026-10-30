import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { handleTaken, setupProfile } from '@/features/social/useSocial';
import { cleanHandle, isValidHandle, MAX_NAME } from '@/lib/validation';

/** First login: pick a handle and a display name. Nothing social works before this. */
export function ProfileSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const { user, isDemo, profile, profileLoading } = useAuth();
  const [handle, setHandle] = React.useState('');
  const [name, setName] = React.useState('');
  const [taken, setTaken] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setTaken(false);
    if (!isValidHandle(handle)) return;
    const timer = setTimeout(() => void handleTaken(handle).then(setTaken).catch(() => undefined), 300);
    return () => clearTimeout(timer);
  }, [handle]);

  if (profileLoading) return null;
  if (isDemo || profile) return <Navigate to={from} replace />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await setupProfile(user.uid, handle, name.trim());
      navigate(from, { replace: true });
    } catch {
      // The batch fails when someone claimed the handle meanwhile.
      setTaken(await handleTaken(handle).catch(() => false));
      toast.error(t('setup.error'));
    } finally {
      setSaving(false);
    }
  }

  const handleOk = isValidHandle(handle) && !taken;
  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            <div className="space-y-2">
              <Label htmlFor="handle">{t('setup.handle')}</Label>
              <div className="flex items-center rounded-md border bg-background pl-3 focus-within:border-primary">
                <span className="text-sm text-muted-foreground">@</span>
                <input id="handle" value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} autoCapitalize="none" autoComplete="off" className="h-10 flex-1 bg-transparent px-1 text-sm outline-none" />
              </div>
              <p className={`text-xs ${taken ? 'text-destructive' : 'text-muted-foreground'}`}>{taken ? t('setup.taken') : t('setup.handleHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('settings.displayName')}</Label>
              <Input id="displayName" value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !handleOk || !name.trim()}>
              {saving ? t('common.loading') : t('setup.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
