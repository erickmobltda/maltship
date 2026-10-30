import { useTranslation } from 'react-i18next';
import { attrDisplay, type AttrValue } from '@/lib/catalog';
import type { AttributeDef } from '@/lib/niche-types';

/** One attribute value, translated when it is an enum or has a unit. */
export function useAttrText() {
  const { t } = useTranslation();
  return (a: AttributeDef, v: AttrValue): string => {
    const d = attrDisplay(a, v);
    if (!d) return '';
    return 'text' in d ? d.text : t(d.key, d.opts);
  };
}
