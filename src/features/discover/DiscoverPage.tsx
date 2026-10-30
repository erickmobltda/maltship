import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { facetValues, filtersFromParams, filtersToParams, search, sortResults, useCatalog, type Filters } from '@/lib/catalog';
import { niche } from '@/niche/config';
import { ItemCard } from '@/components/ItemCard';
import { useAttrText } from '@/components/AttrText';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAGE = 48;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn('h-9 max-w-[11rem] shrink-0 rounded-full border bg-card px-3 text-xs', value ? 'border-primary text-primary' : 'text-muted-foreground')}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DiscoverPage() {
  const { t } = useTranslation();
  const text = useAttrText();
  const { data: catalog, isLoading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = React.useState(PAGE);
  const [showFilters, setShowFilters] = React.useState(false);

  const filters = filtersFromParams(params);
  const apply = (next: Filters) => {
    setParams(filtersToParams(next), { replace: true });
    setShown(PAGE);
  };
  const setFacet = (key: string, value: string) => apply({ ...filters, facets: { ...filters.facets, [key]: value } });

  const all = React.useMemo(() => (catalog ? [...catalog.values()] : []), [catalog]);
  const facetDefs = niche.attributes.filter((a) => a.facet);
  const options = React.useMemo(
    () => Object.fromEntries(facetDefs.map((a) => [a.key, a.type === 'enum' ? a.enumValues ?? [] : facetValues(all, a.key)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = React.useMemo(() => sortResults(search(all, filters)), [all, params]);
  const activeFilters = Object.values(filters.facets).filter(Boolean).length + (filters.minScore ? 1 : 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{t('discover.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('niche:discover.subtitle', { count: all.length })}</p>
      </div>

      <div className="sticky top-14 z-20 -mx-4 space-y-3 bg-background/85 px-4 py-2 backdrop-blur-xl md:-mx-8 md:top-0 md:px-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.text}
              onChange={(e) => apply({ ...filters, text: e.target.value })}
              placeholder={t('niche:discover.placeholder')}
              aria-label={t('discover.search')}
              className="h-11 w-full rounded-xl border bg-card pl-9 pr-9 text-sm outline-none focus:border-primary"
              type="text"
              enterKeyHint="search"
            />
            {filters.text ? (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => apply({ ...filters, text: '' })} aria-label={t('common.clear')}>
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters((v) => !v)} aria-label={t('discover.filters')} aria-expanded={showFilters} className="relative">
            <SlidersHorizontal />
            {activeFilters ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilters}
              </span>
            ) : null}
          </Button>
        </div>

        {showFilters ? (
          <div className="space-y-2 animate-fade-in">
            {facetDefs
              .filter((a) => a.facet === 'chips')
              .map((a) => (
                <div key={a.key} className="scrollbar-hide flex gap-2 overflow-x-auto">
                  {options[a.key].map((v) => (
                    <Chip key={v} active={filters.facets[a.key] === v} onClick={() => setFacet(a.key, filters.facets[a.key] === v ? '' : v)}>
                      {text(a, v)}
                    </Chip>
                  ))}
                </div>
              ))}
            <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
              {niche.scores?.filterSteps.map((s) => (
                <Chip key={s} active={filters.minScore === s} onClick={() => apply({ ...filters, minScore: filters.minScore === s ? 0 : s })}>
                  {t('niche:scores.badge')} {s}+
                </Chip>
              ))}
              {facetDefs
                .filter((a) => a.facet === 'select')
                .map((a) => (
                  <Select
                    key={a.key}
                    value={filters.facets[a.key] ?? ''}
                    onChange={(v) => setFacet(a.key, v)}
                    label={t(`niche:attr.${a.key}`)}
                    options={options[a.key].map((v) => ({ value: v, label: text(a, v) }))}
                  />
                ))}
              {activeFilters ? (
                <button className="shrink-0 text-xs text-muted-foreground underline" onClick={() => apply({ ...filters, facets: {}, minScore: 0 })}>
                  {t('discover.clearFilters')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{t('common.error')}</p> : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t('discover.empty')}</div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t('discover.results', { count: results.length })}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, shown).map((it) => (
              <ItemCard key={it.id} item={it} />
            ))}
          </div>
          {shown < results.length ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                {t('discover.more')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
