// Firestore document shapes (collector-app-blueprint docs/03). Every doc carries `niche`.
export interface Settings {
  niche: string;
  locale: 'en' | 'pt-BR';
  updatedAt: string;
}

export interface Profile {
  niche: string;
  uid: string;
  handle: string;
  displayName: string;
  displayNameLower: string;
  bio: string;
  showCollection: boolean;
  showWishlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnedItem {
  niche: string;
  uid: string;
  itemId: string;
  quantity: number;
  visible: boolean;
  addedAt: string;
  updatedAt: string;
  extra?: Record<string, string | number | boolean>;
}

export interface WishItem {
  niche: string;
  uid: string;
  itemId: string;
  visible: boolean;
  addedAt: string;
}

export interface Rating {
  niche: string;
  uid: string;
  handle: string;
  displayName: string;
  itemId: string;
  stars: number;
  tags: string[];
  notes: string;
  experiencedOn: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  niche: string;
  follower: string;
  followee: string;
  createdAt: string;
}

export type WithId<T> = T & { id: string };
