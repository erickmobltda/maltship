// Restores the public demo account to the sample owned items, wishlist and ratings
// in demo-seed.json, wiping whatever visitors changed.
//
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json npm run reset-demo
//
// The account is shared with the other erickmob apps; only this app's data is
// touched. Its ratings live in its own data (users/{uid}/ratings), never in the
// shared feed. Seed keys are "<root>/<collection>": root is users/{uid} or
// collections/{uid}.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEMO_EMAIL = 'demo@ledgenator.app';
const DEMO_PASSWORD = 'demo1234';
const niche = JSON.parse(readFileSync(new URL('../src/niche/niche.json', import.meta.url), 'utf8'));

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'erickmob-apps' });
const auth = getAuth();
const db = getFirestore();

const seed = JSON.parse(readFileSync(new URL('./demo-seed.json', import.meta.url), 'utf8'));
const demo = await auth.getUserByEmail(DEMO_EMAIL);

// The claim keeps the demo away from paid APIs and from shared data.
await auth.updateUser(demo.uid, { password: DEMO_PASSWORD });
await auth.setCustomUserClaims(demo.uid, { ...(demo.customClaims ?? {}), demo: true });

const now = new Date().toISOString();
for (const [key, docs] of Object.entries(seed)) {
  const [root, collection] = key.split('/');
  const ref = db.collection(`apps/${niche.app}/${root}/${demo.uid}/${collection}`);
  await db.recursiveDelete(ref);
  const batch = db.batch();
  for (const [id, data] of Object.entries(docs)) {
    const doc = { niche: niche.niche, uid: demo.uid, ...data };
    // Demo ratings use the same shape as shared ones.
    if (collection === 'ratings') Object.assign(doc, { handle: 'demo', displayName: 'Demo', likeCount: 0, createdAt: now, updatedAt: now });
    batch.set(ref.doc(id), doc);
  }
  await batch.commit();
  console.log(`${key}: ${Object.keys(docs).length}`);
}
