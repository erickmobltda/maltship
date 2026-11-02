import * as React from 'react';
import { deleteDoc, doc, orderBy, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, paths, type ListName } from '@/lib/firebase';
import { useSnapshot } from '@/lib/useSnapshot';
import { useAuth } from '@/features/auth/AuthProvider';
import { niche } from '@/niche/config';
import type { OwnedItem, RemovedItem, WishItem } from '@/lib/types';

/**
 * A user's owned items (the display) or wishlist, newest first. Document id = item id.
 * Other users only get items with `visible == true`, and only while the owner shows that list.
 */
export function useList<T extends OwnedItem | WishItem>(uid: string | undefined, list: ListName, publicOnly = false) {
  const q = React.useMemo(() => {
    if (!uid) return null;
    return publicOnly
      ? query(paths.list(uid, list), where('visible', '==', true), orderBy('addedAt', 'desc'))
      : query(paths.list(uid, list), orderBy('addedAt', 'desc'));
  }, [uid, list, publicOnly]);
  return useSnapshot<T>(q);
}

export function useMyLists() {
  const { user } = useAuth();
  const owned = useList<OwnedItem>(user?.uid, 'owned');
  const wishlist = useList<WishItem>(user?.uid, 'wishlist');
  return { owned, wishlist };
}

/** What left my collection, newest first. */
export function useRemoved(uid: string | undefined) {
  const q = React.useMemo(() => (uid ? query(paths.removed(uid), orderBy('removedAt', 'desc')) : null), [uid]);
  return useSnapshot<RemovedItem>(q);
}

const now = () => new Date().toISOString();

/** Deletes the item and logs the removal in one write, so neither happens without the other. */
function removeOwned({ uid, itemId, addedAt }: OwnedItem) {
  const removal: RemovedItem = { niche: niche.niche, uid, itemId, addedAt, removedAt: now() };
  const batch = writeBatch(db);
  batch.delete(paths.listItem(uid, 'owned', itemId));
  batch.set(doc(paths.removed(uid)), removal);
  return batch.commit();
}

/** Quantity 0 removes the item; with quantity off in the niche, any positive value means 1. */
export async function setOwned(uid: string, itemId: string, quantity: number, existing?: OwnedItem) {
  if (quantity <= 0) return existing && removeOwned(existing);
  const q = niche.owned.quantity ? Math.min(quantity, niche.owned.maxQuantity) : 1;
  const item: OwnedItem = {
    niche: niche.niche,
    uid,
    itemId,
    quantity: q,
    visible: existing?.visible ?? true,
    addedAt: existing?.addedAt ?? now(),
    updatedAt: now(),
    ...(existing?.extra ? { extra: existing.extra } : {}),
  };
  return setDoc(paths.listItem(uid, 'owned', itemId), item);
}

export async function setOwnedExtra(existing: OwnedItem, key: string, value: string | boolean) {
  const { id: _id, ...rest } = existing as OwnedItem & { id?: string };
  return setDoc(paths.listItem(existing.uid, 'owned', existing.itemId), { ...rest, extra: { ...existing.extra, [key]: value }, updatedAt: now() });
}

export async function setWished(uid: string, itemId: string, on: boolean) {
  if (!on) return deleteDoc(paths.listItem(uid, 'wishlist', itemId));
  const item: WishItem = { niche: niche.niche, uid, itemId, visible: true, addedAt: now() };
  return setDoc(paths.listItem(uid, 'wishlist', itemId), item);
}
