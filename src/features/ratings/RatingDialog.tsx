import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StarInput } from '@/components/Stars';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils';
import { MAX_NOTES, MAX_TAGS, ratingProblems } from '@/lib/validation';
import { niche } from '@/niche/config';
import type { Rating } from '@/lib/types';
import { deleteRating, saveRating } from './useRatings';

const today = () => new Date().toISOString().slice(0, 10);

export function RatingDialog({ open, onOpenChange, itemId, itemName, existing }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string;
  itemName: string;
  existing?: Rating;
}) {
  const { t } = useTranslation();
  const { user, isDemo, profile } = useAuth();
  const [stars, setStars] = React.useState(0);
  const [tags, setTags] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState('');
  const [experiencedOn, setExperiencedOn] = React.useState(today());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStars(existing?.stars ?? 0);
    setTags(existing?.tags ?? []);
    setNotes(existing?.notes ?? '');
    setExperiencedOn(existing?.experiencedOn ?? today());
  }, [open, existing]);

  const toggle = (tag: string) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : cur.length >= MAX_TAGS ? cur : [...cur, tag]));
  const input = { itemId, stars, tags, notes: notes.trim(), experiencedOn };
  const valid = ratingProblems(input).length === 0;

  async function save() {
    if (!user) return;
    const author = isDemo ? { handle: 'demo', displayName: t('demo.name') } : profile;
    if (!author) return;
    setSaving(true);
    try {
      await saveRating(input, user.uid, author, isDemo, existing);
      toast.success(t('rate.saved'));
      onOpenChange(false);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!user) return;
    setSaving(true);
    try {
      await deleteRating(user.uid, itemId, isDemo);
      onOpenChange(false);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t('rate.title')}</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1">
            <StarInput value={stars} onChange={setStars} />
            <span className="text-xs text-muted-foreground">{stars ? `${stars} / 5` : t('rate.tapStars')}</span>
          </div>
          <div className="space-y-2">
            <Label>{t('rate.tags', { max: MAX_TAGS })}</Label>
            <div className="flex flex-wrap gap-2">
              {niche.ratingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tags.includes(tag)}
                  onClick={() => toggle(tag)}
                  className={cn('rounded-full border px-3 py-1.5 text-xs transition-colors', tags.includes(tag) ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground')}
                >
                  {t(`niche:tag.${tag}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experiencedOn">{t('niche:experiencedOn')}</Label>
            <Input id="experiencedOn" type="date" value={experiencedOn} max={today()} onChange={(e) => setExperiencedOn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t('rate.notes')}</Label>
            <textarea
              id="notes"
              value={notes}
              maxLength={MAX_NOTES}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t('rate.notesPlaceholder')}
              className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {!isDemo ? <p className="text-xs text-muted-foreground">{t('rate.public')}</p> : null}
          <div className="flex gap-2">
            {existing ? (
              <Button variant="outline" onClick={remove} disabled={saving}>
                {t('common.delete')}
              </Button>
            ) : null}
            <Button className="flex-1" onClick={save} disabled={saving || !valid}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
