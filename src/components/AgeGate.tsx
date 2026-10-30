import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { niche } from '@/niche/config';
import { Logo } from '@/niche/Logo';
import { LanguageSwitch } from './LanguageSwitch';

const KEY = `${niche.app}.adult`;

function confirmed(): boolean {
  try {
    return localStorage.getItem(KEY) === 'yes';
  } catch {
    return false;
  }
}

/** 18+ confirmation before anything else, when the niche needs it. */
export function AgeGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [ok, setOk] = React.useState(() => !niche.ageGate || confirmed());
  const [refused, setRefused] = React.useState(false);

  if (ok) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="size-16" />
      <h1 className="text-3xl font-semibold">{t('niche:brand.name')}</h1>
      {refused ? (
        <p className="max-w-xs text-muted-foreground">{t('niche:age.refused')}</p>
      ) : (
        <>
          <p className="max-w-xs text-muted-foreground">{t('niche:age.question')}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                try {
                  localStorage.setItem(KEY, 'yes');
                } catch {
                  /* private mode: ask again next visit */
                }
                setOk(true);
              }}
            >
              {t('age.yes')}
            </Button>
            <Button variant="outline" onClick={() => setRefused(true)}>
              {t('age.no')}
            </Button>
          </div>
          <p className="max-w-xs text-xs text-muted-foreground">{t('niche:age.warning')}</p>
        </>
      )}
      <LanguageSwitch />
    </div>
  );
}
