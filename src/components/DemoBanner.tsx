import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

export function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      {t('demo.socialDisabled')}
    </div>
  );
}
