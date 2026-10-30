import * as React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Archive, MessagesSquare, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/niche/Logo';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useAuth } from '@/features/auth/AuthProvider';

const links = [
  { to: '/', icon: Compass, key: 'nav.discover', end: true },
  { to: '/collection', icon: Archive, key: 'niche:owned.title' },
  { to: '/feed', icon: MessagesSquare, key: 'nav.feed' },
  { to: '/me', icon: UserRound, key: 'nav.profile' },
];

export function AppShell() {
  const { t } = useTranslation();
  const brand = t('niche:brand.name');
  const { user, isDemo, profile, profileLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // First login forces profile setup, wherever the user is (the demo has no profile).
  React.useEffect(() => {
    if (user && !isDemo && !profileLoading && !profile && location.pathname !== '/setup') {
      navigate('/setup', { replace: true, state: { from: location.pathname === '/login' ? '/' : location.pathname } });
    }
  }, [user, isDemo, profile, profileLoading, location.pathname, navigate]);

  return (
    <div className="relative flex min-h-dvh flex-col md:flex-row">
      <div className="pointer-events-none fixed left-[-15%] top-[-15%] h-[45%] w-[55%] rounded-full bg-secondary/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] h-[45%] w-[50%] rounded-full bg-primary/10 blur-[140px]" />

      <aside className="z-20 hidden w-60 shrink-0 border-r bg-card/40 backdrop-blur-2xl md:sticky md:top-0 md:flex md:h-dvh md:flex-col">
        <div className="flex h-16 items-center gap-2 px-5 font-display text-xl font-semibold">
          <Logo />
          {brand}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <l.icon className="size-4" />
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <div className="p-5">
          <LanguageSwitch />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/70 px-4 pb-2 pt-safe backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Logo className="size-6" />
          {brand}
        </div>
      </header>

      <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/80 pb-safe backdrop-blur-xl md:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn('flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
            }
          >
            <l.icon className="size-5" />
            {t(l.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
