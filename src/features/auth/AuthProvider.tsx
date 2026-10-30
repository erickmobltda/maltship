import * as React from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getDoc, onSnapshot } from 'firebase/firestore';
import { auth, paths } from '@/lib/firebase';
import i18n, { LANGUAGES } from '@/lib/i18n';
import type { Profile, Settings, WithId } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** The public demo account (custom claim `demo`): kept out of shared data. */
  isDemo: boolean;
  /** My public profile; null until set up (always null for the demo). */
  profile: WithId<Profile> | null;
  profileLoading: boolean;
}

const AuthContext = React.createContext<AuthState>({ user: null, loading: true, isDemo: false, profile: null, profileLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<AuthState, 'profile' | 'profileLoading'>>({ user: null, loading: true, isDemo: false });
  // `uid` tells which user the profile state belongs to, so a fresh login never sees the previous user's "no profile".
  const [profile, setProfile] = React.useState<{ uid: string | null; data: WithId<Profile> | null; loading: boolean }>({ uid: null, data: null, loading: true });

  React.useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        const isDemo = user ? (await user.getIdTokenResult()).claims.demo === true : false;
        setState({ user, loading: false, isDemo });
        if (!user) return;
        // The language saved in settings wins over this browser's choice.
        const saved = (await getDoc(paths.settings(user.uid)).catch(() => null))?.data() as Settings | undefined;
        if (saved?.locale && (LANGUAGES as readonly string[]).includes(saved.locale)) void i18n.changeLanguage(saved.locale);
      }),
    [],
  );

  React.useEffect(() => {
    const { user, isDemo } = state;
    if (!user || isDemo) {
      setProfile({ uid: user?.uid ?? null, data: null, loading: false });
      return;
    }
    return onSnapshot(
      paths.profile(user.uid),
      (snap) => setProfile({ uid: user.uid, data: snap.exists() ? { ...(snap.data() as Profile), id: snap.id } : null, loading: false }),
      () => setProfile({ uid: user.uid, data: null, loading: false }),
    );
  }, [state]);

  const value = React.useMemo(() => {
    const current = profile.uid === (state.user?.uid ?? null);
    return {
      ...state,
      profile: current ? profile.data : null,
      profileLoading: state.loading || !current || (!!state.user && !state.isDemo && profile.loading),
    };
  }, [state, profile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => React.useContext(AuthContext);
