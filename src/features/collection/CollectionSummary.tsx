import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Stars } from '@/components/Stars';
import { useAttrText } from '@/components/AttrText';
import type { Item } from '@/lib/catalog';
import type { OwnedItem, Rating, RemovedItem } from '@/lib/types';
import { niche } from '@/niche/config';
import { cn } from '@/lib/utils';
import { activitySeries, averageRating, countUnits, defaultBucket, earliestDay, lastMonths, toDay, topTraits, type Bucket, type DayRange } from './collectionStats';

const ADDED_COLOR = '#3987e5';
const REMOVED_COLOR = '#d95926';
const HEIGHT = 140;
const PAD = { top: 12, right: 10, bottom: 22, left: 26 };
const PERIODS = [12, 6, 3, 1] as const;
const BUCKETS: Bucket[] = ['month', 'week', 'day'];

type ActivityPoint = ReturnType<typeof activitySeries>[number];

function dayLabel(day: string, lang: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, options).format(new Date(y, m - 1, d));
}

/** What a data point covers, in words: "nov. de 2026", "3 – 9 nov. 2026" or "3 de nov. de 2026". */
function pointLabel({ start, end }: ActivityPoint, bucket: Bucket, lang: string) {
  if (start === end) return dayLabel(start, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  if (bucket === 'month' && start.endsWith('-01')) return dayLabel(start, lang, { month: 'short', year: 'numeric' });
  return `${dayLabel(start, lang, { day: 'numeric', month: 'short' })} – ${dayLabel(end, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`;
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

function Key({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

function ActivityChart({ data, bucket }: { data: ActivityPoint[]; bucket: Bucket }) {
  const { t, i18n } = useTranslation();
  const [ref, width] = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  const max = Math.max(1, ...data.flatMap((d) => [d.added, d.removed]));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const single = data.length === 1;
  const x = (i: number) => PAD.left + (single ? plotWidth / 2 : (i * plotWidth) / (data.length - 1));
  const y = (v: number) => PAD.top + plotHeight - (v * plotHeight) / max;
  const line = (value: (d: ActivityPoint) => number) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(value(d))}`).join('');
  const addedLine = line((d) => d.added);
  const yearInLabel = bucket === 'month' && data.length > 12;
  const axisLabel = (d: ActivityPoint) =>
    dayLabel(d.start, i18n.language, bucket === 'month' ? { month: 'short', ...(yearInLabel ? { year: '2-digit' } : {}) } : { day: 'numeric', month: 'short' }).replace(/\./g, '');
  // About 5.5 px per letter at this size, and the last label sits half a label further left.
  const labelWidth = Math.max(...data.map((d) => axisLabel(d).length)) * 5.5 + 10;
  const labelStep = Math.ceil(data.length / Math.max(1, Math.floor((plotWidth - labelWidth / 2) / labelWidth)));
  const active = hover === null ? null : data[hover];
  const quiet = data.every((d) => !d.added && !d.removed);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    const i = Math.round(((e.clientX - left - PAD.left) / plotWidth) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <div ref={ref} className="relative mt-2">
      {width > 0 ? (
        <svg width={width} height={HEIGHT} role="img" aria-label={t('niche:owned.activityChart')} className="touch-pan-y" onPointerDown={pick} onPointerMove={pick} onPointerLeave={() => setHover(null)}>
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
              <text key={d.start} x={x(i)} y={HEIGHT - 6} textAnchor={i === data.length - 1 && !single ? 'end' : 'middle'} fontSize="10" fill="hsl(var(--muted-foreground))">
                {axisLabel(d)}
              </text>
            ) : null,
          )}
          <path d={`${addedLine}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={ADDED_COLOR} opacity="0.1" />
          <path d={addedLine} fill="none" stroke={ADDED_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={line((d) => d.removed)} fill="none" stroke={REMOVED_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {single && !active ? (
            <>
              <circle cx={x(0)} cy={y(data[0].added)} r="4" fill={ADDED_COLOR} stroke="hsl(var(--card))" strokeWidth="2" />
              <circle cx={x(0)} cy={y(data[0].removed)} r="4" fill={REMOVED_COLOR} stroke="hsl(var(--card))" strokeWidth="2" />
            </>
          ) : null}
          {quiet ? (
            <text x={PAD.left + plotWidth / 2} y={PAD.top + plotHeight / 2} textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))">
              {t('collection.summary.noActivity')}
            </text>
          ) : null}
          {active && hover !== null ? (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="hsl(var(--muted-foreground))" />
              <circle cx={x(hover)} cy={y(active.added)} r="4" fill={ADDED_COLOR} stroke="hsl(var(--card))" strokeWidth="2" />
              <circle cx={x(hover)} cy={y(active.removed)} r="4" fill={REMOVED_COLOR} stroke="hsl(var(--card))" strokeWidth="2" />
            </>
          ) : null}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
      {active && hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-background px-2 py-1 text-xs shadow"
          style={{ left: Math.min(width - 72, Math.max(72, x(hover))) }}
        >
          <div className="text-muted-foreground">{pointLabel(active, bucket, i18n.language)}</div>
          <Key color={ADDED_COLOR}>{t('collection.summary.addedCount', { count: active.added })}</Key>
          <Key color={REMOVED_COLOR}>{t('collection.summary.removedCount', { count: active.removed })}</Key>
        </div>
      ) : null}
      <table className="sr-only">
        <caption>{t('niche:owned.activityChart')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('collection.summary.period')}</th>
            <th scope="col">{t('collection.summary.added')}</th>
            <th scope="col">{t('collection.summary.removed')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.start}>
              <th scope="row">{pointLabel(d, bucket, i18n.language)}</th>
              <td>{d.added}</td>
              <td>{d.removed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Choices<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('min-h-8 rounded-full border px-2.5 text-xs font-medium transition-colors', o.value === value ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ActivityCard({ owned, removed }: { owned: OwnedItem[]; removed: RemovedItem[] }) {
  const { t } = useTranslation();
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number] | 'custom'>(12);
  const [custom, setCustom] = React.useState<DayRange>(() => lastMonths(12));
  // null follows the period; a click on a grouping holds until the period changes.
  const [chosenBucket, setChosenBucket] = React.useState<Bucket | null>(null);

  const today = toDay(new Date());
  const earliest = earliestDay(owned, removed);
  const range = React.useMemo<DayRange>(() => {
    if (period !== 'custom') return lastMonths(period);
    const [a, b] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    const to = b > today ? today : b;
    return { from: a < earliest ? (earliest < to ? earliest : to) : a > to ? to : a, to };
  }, [period, custom, today, earliest]);
  const bucket = chosenBucket ?? defaultBucket(range);
  const data = React.useMemo(() => activitySeries(owned, removed, range, bucket), [owned, removed, range, bucket]);

  const choosePeriod = (next: typeof period) => {
    if (next === 'custom' && period !== 'custom') setCustom(range);
    setPeriod(next);
    setChosenBucket(null);
  };
  const setDate = (key: keyof DayRange, value: string) => {
    if (!value) return;
    setCustom((c) => ({ ...c, [key]: value }));
    setChosenBucket(null);
  };
  const dateClass = 'h-8 rounded-md border bg-card px-2 text-xs outline-none [color-scheme:dark] focus:border-primary';

  return (
    <div className="col-span-2 rounded-xl border bg-card p-4 md:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium">{t('niche:owned.activityChart')}</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Key color={ADDED_COLOR}>{t('collection.summary.added')}</Key>
          <Key color={REMOVED_COLOR}>{t('collection.summary.removed')}</Key>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Choices
          label={t('collection.summary.period')}
          value={period}
          onChange={choosePeriod}
          options={[
            ...PERIODS.map((n) => ({ value: n, label: n === 1 ? t('collection.summary.oneMonth') : t('collection.summary.months', { count: n }) })),
            { value: 'custom' as const, label: t('collection.summary.custom') },
          ]}
        />
        <Choices label={t('collection.summary.groupBy')} value={bucket} onChange={setChosenBucket} options={BUCKETS.map((b) => ({ value: b, label: t(`collection.summary.bucket.${b}`) }))} />
      </div>
      {period === 'custom' ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            {t('collection.summary.from')}
            <input type="date" className={dateClass} value={custom.from} min={earliest} max={today} onChange={(e) => setDate('from', e.target.value)} />
          </label>
          <label className="flex items-center gap-1.5">
            {t('collection.summary.to')}
            <input type="date" className={dateClass} value={custom.to} min={earliest} max={today} onChange={(e) => setDate('to', e.target.value)} />
          </label>
        </div>
      ) : null}
      <ActivityChart data={data} bucket={bucket} />
    </div>
  );
}

/** The numbers at the top of the collection: how much, how it grew, what it has in common, how it rates. */
export function CollectionSummary({ owned, removed, ratings, catalog }: { owned: OwnedItem[]; removed: RemovedItem[]; ratings: Rating[]; catalog: Map<string, Item> }) {
  const { t, i18n } = useTranslation();
  const text = useAttrText();
  const units = countUnits(owned);
  const items = owned.flatMap((o) => catalog.get(o.itemId) ?? []);
  const traits = topTraits(items, niche.attributes);
  const { average, rated } = averageRating(owned, ratings);

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

      <ActivityCard owned={owned} removed={removed} />
    </section>
  );
}
