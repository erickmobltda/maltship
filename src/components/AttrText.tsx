import { useTranslation } from 'react-i18next';
import { attrDisplay, type AttrValue } from '@/lib/catalog';
import type { AttributeDef } from '@/lib/niche-types';

/** One attribute value, translated when it is an enum (or a list of fixed values) or has a unit. */
export function useAttrText() {
  const { t } = useTranslation();
  return (a: AttributeDef, v: AttrValue): string => {
    const d = attrDisplay(a, v);
    if (!d) return '';
    if ('keys' in d) return d.keys.map((k) => t(k)).join(', ');
    return 'text' in d ? d.text : t(d.key, d.opts);
  };
}
