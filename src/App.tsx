import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AgeGate } from '@/components/AgeGate';
import { RequireAuth, RequireProfile } from '@/features/auth/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { DiscoverPage } from '@/features/discover/DiscoverPage';
import { ItemPage } from '@/features/item/ItemPage';
import { CollectionPage } from '@/features/collection/CollectionPage';
import { FeedPage } from '@/features/social/FeedPage';
import { ProfilePage } from '@/features/social/ProfilePage';
import { FollowListPage } from '@/features/social/FollowListPage';
import { PeoplePage } from '@/features/social/PeoplePage';
import { MePage } from '@/features/social/MePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfileSetupPage } from '@/features/settings/ProfileSetupPage';

export default function App() {
  return (
    <AgeGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DiscoverPage />} />
          <Route path="item/:id" element={<ItemPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="setup" element={<ProfileSetupPage />} />
            <Route element={<RequireProfile />}>
              <Route path="collection" element={<CollectionPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="me" element={<MePage />} />
              <Route path="u/:handle" element={<ProfilePage />} />
              <Route path="u/:handle/followers" element={<FollowListPage kind="followers" />} />
              <Route path="u/:handle/following" element={<FollowListPage kind="following" />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AgeGate>
  );
}
