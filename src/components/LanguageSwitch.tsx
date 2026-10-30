import { useTranslation } from 'react-i18next';
import { setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { paths } from '@/lib/firebase';
import { currentLanguage, LANGUAGES, type Language } from '@/lib/i18n';
import { useAuth } from '@/features/auth/AuthProvider';
import { niche } from '@/niche/config';

const LABEL: Record<Language, string> = { 'pt-BR': 'Português', en: 'English' };

/** English / Português. Signed-in users keep the choice in their settings. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const lang = currentLanguage();
  const choose = (l: Language) => {
    void i18n.changeLanguage(l);
    if (user) void setDoc(paths.settings(user.uid), { niche: niche.niche, locale: l, updatedAt: new Date().toISOString() }).catch(() => undefined);
  };
  return (
    <div role="radiogroup" aria-label={t('settings.language')} className={cn('inline-flex rounded-full border p-0.5 text-xs', className)}>
      {LANGUAGES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={lang === l}
          onClick={() => choose(l)}
          className={cn('rounded-full px-3 py-1', lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
