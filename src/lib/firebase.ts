import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getFirestore } from 'firebase/firestore';
import { niche } from '@/niche/config';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// Local development against `firebase emulators:start --only auth,firestore` (README).
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Public sandbox account shared by the erickmob apps (custom claim `demo`).
// Restore its sample data with `npm run reset-demo`.
export const DEMO_EMAIL = 'demo@ledgenator.app';
export const DEMO_PASSWORD = 'demo1234';

export type ListName = 'owned' | 'wishlist';

// Every Firestore path of the app is built here (collector-app-blueprint docs/03).
// Private data: apps/<APP>/users/{uid}. Shared: profiles, handles, collections,
// ratings (+ likes), follows. The demo keeps its ratings in users/{uid}/ratings.
const A = ['apps', niche.app] as const;

export const paths = {
  settings: (uid: string) => doc(db, ...A, 'users', uid, 'settings', 'main'),
  profiles: () => collection(db, ...A, 'profiles'),
  profile: (uid: string) => doc(db, ...A, 'profiles', uid),
  handles: () => collection(db, ...A, 'handles'),
  handle: (handle: string) => doc(db, ...A, 'handles', handle),
  list: (uid: string, list: ListName) => collection(db, ...A, 'collections', uid, list),
  listItem: (uid: string, list: ListName, itemId: string) => doc(db, ...A, 'collections', uid, list, itemId),
  ratings: () => collection(db, ...A, 'ratings'),
  rating: (uid: string, itemId: string) => doc(db, ...A, 'ratings', `${uid}_${itemId}`),
  ratingById: (id: string) => doc(db, ...A, 'ratings', id),
  likes: (ratingId: string) => collection(db, ...A, 'ratings', ratingId, 'likes'),
  like: (ratingId: string, uid: string) => doc(db, ...A, 'ratings', ratingId, 'likes', uid),
  follows: () => collection(db, ...A, 'follows'),
  follow: (follower: string, followee: string) => doc(db, ...A, 'follows', `${follower}_${followee}`),
  demoRatings: (uid: string) => collection(db, ...A, 'users', uid, 'ratings'),
  demoRating: (uid: string, itemId: string) => doc(db, ...A, 'users', uid, 'ratings', itemId),
};
