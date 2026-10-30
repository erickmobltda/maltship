import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDoc, documentId, getCountFromServer, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { db, paths } from '@/lib/firebase';
import { chunk } from '@/lib/feed';
import { useSnapshot } from '@/lib/useSnapshot';
import { niche } from '@/niche/config';
import type { Follow, Profile, WithId } from '@/lib/types';

const now = () => new Date().toISOString();

/** Live profile by uid (null = none). */
export function useProfile(uid: string | undefined) {
  const [state, setState] = React.useState<{ data: WithId<Profile> | null; loading: boolean }>({ data: null, loading: !!uid });
  React.useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      paths.profile(uid),
      (s) => setState({ data: s.exists() ? { ...(s.data() as Profile), id: s.id } : null, loading: false }),
      () => setState({ data: null, loading: false }),
    );
  }, [uid]);
  return state;
}

/** Handle → uid (handles/{handle}). */
export function useHandleUid(handle: string | undefined) {
  return useQuery({
    queryKey: ['handle', handle],
    enabled: !!handle,
    queryFn: async () => ((await getDoc(paths.handle(handle!))).data()?.uid as string | undefined) ?? null,
  });
}

export async function handleTaken(handle: string) {
  return (await getDoc(paths.handle(handle))).exists();
}

/** First login: claim the handle and create the profile in one batch (rules demand both). */
export async function setupProfile(uid: string, handle: string, displayName: string) {
  const t = now();
  const b = writeBatch(db);
  b.set(paths.handle(handle), { uid, createdAt: t });
  const profile: Profile = {
    niche: niche.niche,
    uid,
    handle,
    displayName,
    displayNameLower: displayName.toLowerCase(),
    bio: '',
    showCollection: false,
    showWishlist: false,
    createdAt: t,
    updatedAt: t,
  };
  b.set(paths.profile(uid), profile);
  await b.commit();
}

/** Edit my profile. A new display name is copied onto my ratings (denormalized for the feed). */
export async function updateProfile(current: WithId<Profile>, changes: Partial<Pick<Profile, 'displayName' | 'bio' | 'showCollection' | 'showWishlist'>>) {
  const { id: _id, ...base } = current;
  const next: Profile = { ...base, ...changes, updatedAt: now() };
  next.displayNameLower = next.displayName.toLowerCase();
  await setDoc(paths.profile(current.uid), next);
  if (changes.displayName !== undefined && changes.displayName !== current.displayName) {
    const mine = await getDocs(query(paths.ratings(), where('uid', '==', current.uid)));
    for (const group of chunk(mine.docs, 400)) {
      const b = writeBatch(db);
      group.forEach((d) => b.update(d.ref, { displayName: next.displayName }));
      await b.commit();
    }
  }
}

// ---- Follows ----

export function useFollows(field: 'follower' | 'followee', uid: string | undefined) {
  const q = React.useMemo(() => (uid ? query(paths.follows(), where(field, '==', uid), orderBy('createdAt', 'desc')) : null), [field, uid]);
  return useSnapshot<Follow>(q);
}

export function useIsFollowing(me: string | undefined, them: string | undefined) {
  const [following, setFollowing] = React.useState(false);
  React.useEffect(() => {
    if (!me || !them || me === them) return;
    return onSnapshot(paths.follow(me, them), (s) => setFollowing(s.exists()), () => setFollowing(false));
  }, [me, them]);
  return following;
}

/** Follower / following counts from count() queries (no stored counters). */
export function useFollowCounts(uid: string | undefined) {
  return useQuery({
    queryKey: ['followCounts', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        getCountFromServer(query(paths.follows(), where('followee', '==', uid))),
        getCountFromServer(query(paths.follows(), where('follower', '==', uid))),
      ]);
      return { followers: followers.data().count, following: following.data().count };
    },
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return async (me: string, them: string, on: boolean) => {
    if (on) {
      const f: Follow = { niche: niche.niche, follower: me, followee: them, createdAt: now() };
      await setDoc(paths.follow(me, them), f);
    } else {
      await deleteDoc(paths.follow(me, them));
    }
    void qc.invalidateQueries({ queryKey: ['followCounts'] });
  };
}

/** Profiles for a list of uids (documentId() in chunks of 30). */
export function useProfiles(uids: string[]) {
  const key = uids.join(',');
  return useQuery({
    queryKey: ['profiles', key],
    enabled: uids.length > 0,
    queryFn: async () => {
      const out = new Map<string, WithId<Profile>>();
      for (const group of chunk(uids)) {
        const snap = await getDocs(query(paths.profiles(), where(documentId(), 'in', group)));
        snap.docs.forEach((d) => out.set(d.id, { ...(d.data() as Profile), id: d.id }));
      }
      return out;
    },
  });
}

// ---- Likes ----

export function useLiked(ratingId: string, me: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['liked', ratingId, me],
    enabled: enabled && !!me,
    queryFn: async () => (await getDoc(paths.like(ratingId, me!))).exists(),
  });
}

/** Like or unlike: the like doc and likeCount ±1 in one batch (the rules check both). */
export function useToggleLike() {
  const qc = useQueryClient();
  return async (ratingId: string, me: string, on: boolean) => {
    qc.setQueryData(['liked', ratingId, me], on);
    try {
      const b = writeBatch(db);
      if (on) b.set(paths.like(ratingId, me), { niche: niche.niche, uid: me, createdAt: now() });
      else b.delete(paths.like(ratingId, me));
      b.update(paths.ratingById(ratingId), { likeCount: increment(on ? 1 : -1) });
      await b.commit();
    } catch (e) {
      qc.setQueryData(['liked', ratingId, me], !on);
      throw e;
    }
  };
}

// ---- Find people ----

const END = '';

/** `@abc` searches handles by prefix; anything else searches display names by prefix. */
export async function searchPeople(raw: string): Promise<WithId<Profile>[]> {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  if (q.startsWith('@')) {
    const h = q.slice(1);
    if (!h) return [];
    const snap = await getDocs(query(paths.handles(), where(documentId(), '>=', h), where(documentId(), '<', h + END), limit(20)));
    const uids = snap.docs.map((d) => d.data().uid as string);
    if (!uids.length) return [];
    const profiles = await getDocs(query(paths.profiles(), where(documentId(), 'in', uids)));
    return profiles.docs.map((d) => ({ ...(d.data() as Profile), id: d.id }));
  }
  const snap = await getDocs(query(paths.profiles(), where('displayNameLower', '>=', q), where('displayNameLower', '<', q + END), limit(20)));
  return snap.docs.map((d) => ({ ...(d.data() as Profile), id: d.id }));
}
