import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Lobby from './pages/Lobby';
import Admin from './pages/Admin';
import AdminRooms from './pages/admin/Rooms';
import AdminEvents from './pages/admin/Events';
import AdminAlerts from './pages/admin/Alerts';
import AdminTrainers from './pages/admin/Trainers';
import AdminCarousel from './pages/admin/Carousel';
import AdminSignOnLog from './pages/admin/SignOnLog';
import AdminRssFeeds from './pages/admin/RssFeeds';
import AdminSettings from './pages/admin/Settings';

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
          <Route path="carousel" element={<AdminCarousel />} />
          <Route path="trainers" element={<AdminTrainers />} />
          <Route path="signon-log" element={<AdminSignOnLog />} />
          <Route path="rss" element={<AdminRssFeeds />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
