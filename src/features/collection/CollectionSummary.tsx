import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Stars } from '@/components/Stars';
import { useAttrText } from '@/components/AttrText';
import type { Item } from '@/lib/catalog';
import type { OwnedItem, Rating } from '@/lib/types';
import { niche } from '@/niche/config';
import { averageRating, countUnits, monthlyAdded, topTraits } from './collectionStats';

const ADDED_COLOR = '#3987e5';
const HEIGHT = 140;
const PAD = { top: 12, right: 10, bottom: 22, left: 26 };

function monthLabel(month: string, lang: string, options: Intl.DateTimeFormatOptions) {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function useWidth() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function AddedChart({ data }: { data: { month: string; count: number }[] }) {
  const { t, i18n } = useTranslation();
  const [ref, width] = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i * plotWidth) / (data.length - 1);
  const y = (v: number) => PAD.top + plotHeight - (v * plotHeight) / max;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.count)}`).join('');
  const labelStep = width < 420 ? 2 : 1;
  const active = hover === null ? null : data[hover];

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const i = Math.round(((e.clientX - left - PAD.left) / plotWidth) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <div ref={ref} className="relative mt-2">
      {width > 0 ? (
        <svg width={width} height={HEIGHT} role="img" aria-label={t('collection.summary.addedChart')} className="touch-pan-y" onPointerDown={pick} onPointerMove={pick} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="hsl(var(--border))" />
              <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
                {v}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (data.length - 1 - i) % labelStep === 0 ? (
              <text key={d.month} x={x(i)} y={HEIGHT - 6} textAnchor={i === data.length - 1 ? 'end' : 'middle'} fontSize="10" fill="hsl(var(--muted-foreground))">
                {monthLabel(d.month, i18n.language, { month: 'short' }).replace('.', '')}
              </text>
            ) : null,
          )}
          <path d={`${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={ADDED_COLOR} opacity="0.1" />
          <path d={line} fill="none" stroke={ADDED_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {active && hover !== null ? (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="hsl(var(--muted-foreground))" />
              <circle cx={x(hover)} cy={y(active.count)} r="4" fill={ADDED_COLOR} stroke="hsl(var(--card))" strokeWidth="2" />
            </>
          ) : null}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
      {active && hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-background px-2 py-1 text-xs shadow"
          style={{ left: Math.min(width - 60, Math.max(60, x(hover))) }}
        >
          {monthLabel(active.month, i18n.language, { month: 'short', year: 'numeric' })}: <strong>{t('collection.summary.addedCount', { count: active.count })}</strong>
        </div>
      ) : null}
      <table className="sr-only">
        <caption>{t('collection.summary.addedChart')}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th scope="row">{monthLabel(d.month, i18n.language, { month: 'long', year: 'numeric' })}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The numbers at the top of the collection: how much, how it grew, what it has in common, how it rates. */
export function CollectionSummary({ owned, ratings, catalog }: { owned: OwnedItem[]; ratings: Rating[]; catalog: Map<string, Item> }) {
  const { t, i18n } = useTranslation();
  const text = useAttrText();
  const units = countUnits(owned);
  const items = owned.flatMap((o) => catalog.get(o.itemId) ?? []);
  const traits = topTraits(items, niche.attributes);
  const { average, rated } = averageRating(owned, ratings);
  const added = monthlyAdded(owned);

  return (
    <section aria-label={t('collection.summary.title')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="text-3xl font-semibold">{new Intl.NumberFormat(i18n.language).format(units)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t('niche:owned.statCount', { count: units })}</div>
        {units !== owned.length ? <div className="text-xs text-muted-foreground">{t('collection.summary.different', { count: owned.length })}</div> : null}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="text-3xl font-semibold">{average === null ? '—' : new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average)}</div>
        {average === null ? null : <Stars value={Math.round(average * 2) / 2} className="mt-1" />}
        <div className="mt-1 text-xs text-muted-foreground">{t('collection.summary.average')}</div>
        <div className="text-xs text-muted-foreground">{t('collection.summary.ratedOf', { rated, total: owned.length })}</div>
      </div>

      <div className="col-span-2 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">{t('collection.summary.traits')}</h2>
        {traits.length ? (
          <ul className="mt-3 space-y-2.5">
            {traits.map((x) => (
              <li key={`${x.attr.key}:${x.value}`}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{t(`niche:attr.${x.attr.key}`)}:</span> {text(x.attr, x.value)}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {x.count} · {Math.round((x.count / items.length) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(x.count / items.length) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{t('collection.summary.traitsEmpty')}</p>
        )}
      </div>

      <div className="col-span-2 rounded-xl border bg-card p-4 md:col-span-4">
        <h2 className="text-sm font-medium">{t('collection.summary.addedChart')}</h2>
        <AddedChart data={added} />
      </div>
    </section>
  );
}
