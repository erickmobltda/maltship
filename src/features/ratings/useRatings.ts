import * as React from 'react';
import { deleteDoc, getDocs, limit, orderBy, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, paths } from '@/lib/firebase';
import { useSnapshot, useSnapshots } from '@/lib/useSnapshot';
import { chunk, mergeFeeds } from '@/lib/feed';
import { useAuth } from '@/features/auth/AuthProvider';
import { niche } from '@/niche/config';
import type { Profile, Rating } from '@/lib/types';

export const FEED_SIZE = 40;

// The demo's ratings live in its own data (users/{uid}/ratings/{itemId}): they stay out of
// everyone's feed, and the demo sees only its own.
export function useItemRatings(itemId: string) {
  const { user, isDemo } = useAuth();
  const q = React.useMemo(() => {
    if (!user) return null;
    return isDemo
      ? query(paths.demoRatings(user.uid), where('itemId', '==', itemId))
      : query(paths.ratings(), where('itemId', '==', itemId), orderBy('updatedAt', 'desc'));
  }, [user, isDemo, itemId]);
  return useSnapshot<Rating>(q);
}

export function useUserRatings(uid: string | undefined) {
  const { user, isDemo } = useAuth();
  const q = React.useMemo(() => {
    if (!user || !uid) return null;
    return isDemo && uid === user.uid
      ? query(paths.demoRatings(uid), orderBy('experiencedOn', 'desc'))
      : query(paths.ratings(), where('uid', '==', uid), orderBy('experiencedOn', 'desc'), limit(50));
  }, [user, isDemo, uid]);
  return useSnapshot<Rating>(q);
}

export function useEveryoneFeed() {
  const { user, isDemo } = useAuth();
  const q = React.useMemo(() => {
    if (!user) return null;
    return isDemo
      ? query(paths.demoRatings(user.uid), orderBy('updatedAt', 'desc'), limit(FEED_SIZE))
      : query(paths.ratings(), orderBy('updatedAt', 'desc'), limit(FEED_SIZE));
  }, [user, isDemo]);
  return useSnapshot<Rating>(q);
}

/** Ratings from the people I follow plus my own, newest first (fan-in on read, 30 uids per query). */
export function useFollowingFeed(followees: string[]) {
  const { user } = useAuth();
  const key = followees.join(',');
  const queries = React.useMemo(() => {
    if (!user) return [];
    const uids = [...new Set([user.uid, ...followees])];
    return chunk(uids).map((uids) => query(paths.ratings(), where('uid', 'in', uids), orderBy('updatedAt', 'desc'), limit(FEED_SIZE)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);
  const res = useSnapshots<Rating>(queries);
  const data = React.useMemo(() => mergeFeeds(res.data, FEED_SIZE), [res.data]);
  return { data, loading: res.loading, tooMany: queries.length > 10 };
}

export interface RatingInput {
  itemId: string;
  stars: number;
  tags: string[];
  notes: string;
  experiencedOn: string;
}

/** Publish (or edit) my rating. Author fields come from my profile, as the rules require. */
export async function saveRating(input: RatingInput, uid: string, author: Pick<Profile, 'handle' | 'displayName'>, isDemo: boolean, existing?: Rating) {
  const now = new Date().toISOString();
  const rating: Rating = {
    niche: niche.niche,
    uid,
    handle: author.handle,
    displayName: author.displayName,
    ...input,
    likeCount: existing?.likeCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await setDoc(isDemo ? paths.demoRating(uid, input.itemId) : paths.rating(uid, input.itemId), rating);
}

// Each like delete reads the rating in the rules (20 doc accesses per batch), so delete in small batches.
const LIKE_DELETE_BATCH = 8;

export async function deleteRating(uid: string, itemId: string, isDemo: boolean) {
  if (isDemo) return deleteDoc(paths.demoRating(uid, itemId));
  const ratingId = `${uid}_${itemId}`;
  const likes = await getDocs(paths.likes(ratingId));
  for (const group of chunk(likes.docs, LIKE_DELETE_BATCH)) {
    const b = writeBatch(db);
    group.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  await deleteDoc(paths.rating(uid, itemId));
}
