import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  Users,
  ClipboardList,
  Rss,
  Settings as SettingsIcon,
} from 'lucide-react';

import Lobby from './pages/Lobby';
import Admin from './pages/Admin';
import AdminRooms from './pages/admin/Rooms';
import AdminEvents from './pages/admin/Events';
import AdminAlerts from './pages/admin/Alerts';
import Placeholder from './pages/admin/Placeholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />

        <Route path="/admin" element={<Admin />}>
          <Route index element={<Navigate to="rooms" replace />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="alerts" element={<AdminAlerts />} />
          <Route
            path="carousel"
            element={
              <Placeholder
                title="Campus Life Carousel"
                description="Manage the rotating photo gallery shown on the lobby dashboard."
                icon={ImageIcon}
                phase="Phase 4"
              />
            }
          />
          <Route
            path="trainers"
            element={
              <Placeholder
                title="Trainer Management"
                description="Add and manage trainer profiles with photos."
                icon={Users}
                phase="Phase 4"
              />
            }
          />
          <Route
            path="signon-log"
            element={
              <Placeholder
                title="Sign-On Log"
                description="Historical record of trainer sign-ons and sign-offs."
                icon={ClipboardList}
                phase="Phase 4"
              />
            }
          />
          <Route
            path="rss"
            element={
              <Placeholder
                title="RSS Feeds"
                description="Manage RSS sources for the news ticker."
                icon={Rss}
                phase="Phase 6"
              />
            }
          />
          <Route
            path="settings"
            element={
              <Placeholder
                title="Global Settings"
                description="Carousel timing, WiFi, contact directory, and brand settings."
                icon={SettingsIcon}
                phase="Phase 4"
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
