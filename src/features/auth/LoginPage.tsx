import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/firebase';
import { toast } from '@/components/ui/toast';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/niche/Logo';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadingDemo, setLoadingDemo] = React.useState(false);

  async function signIn(withEmail: string, withPassword: string, setBusy: (v: boolean) => void) {
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, withEmail, withPassword);
      navigate(from, { replace: true });
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-10">
      <Logo className="mb-2 size-14" />
      <h1 className="mb-1 text-3xl font-semibold">{t('niche:brand.name')}</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">{t('niche:brand.tagline')}</p>
      <LanguageSwitch className="mb-6" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('auth.signIn')}</CardTitle>
          <CardDescription>{t('auth.inviteOnly')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email, password, setLoading);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? t('common.loading') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 border-t pt-4">
            <Button variant="outline" className="w-full" onClick={() => void signIn(DEMO_EMAIL, DEMO_PASSWORD, setLoadingDemo)} disabled={loadingDemo}>
              {loadingDemo ? t('common.loading') : t('auth.demoButton')}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
