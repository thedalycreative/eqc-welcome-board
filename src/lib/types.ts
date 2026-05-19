// Shared types for the EQC Dashboard.

export interface RoomAllocation {
  id: number;
  roomName: string;
  status: 'available' | 'live' | 'break' | 'inactive';
  course?: string;
  topic?: string;
  trainer?: string;
  trainerId?: string;
  intake?: string;
  breakUntil?: string; // ISO timestamp - when the break ends
}

export interface Event {
  id: number;
  title: string;
  date: string;
  description: string;
  icon?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  intake: string;
  room: string;
  course: string;
  topics?: string;
}

export interface Announcement {
  id: number;
  text: string;
  color: string;
  bgColor?: string;        // optional background colour override
  textColor?: string;      // optional text colour
  textSize?: 'sm' | 'md' | 'lg';
  scrollSpeed?: 'slow' | 'medium' | 'fast';
  expiresAt: string;
}

export interface Trainer {
  id: string;
  name: string;
  photoUrl: string;
  bio?: string;
  quote?: string;
  active: boolean;
  createdAt: string;
}

export interface CarouselItem {
  id: string;
  imageUrl: string;
  caption?: string;
  order: number;
  createdAt: string;
}

export interface SignOnLogEntry {
  id: string;
  trainerName: string;
  trainerId?: string;
  roomNumber: string;
  intakeNumber: string;
  course: string;
  action: 'sign-on' | 'sign-off';
  timestamp: string;
}

export interface RssFeed {
  id: string;
  label: string;
  url: string;
  category: 'cybersecurity' | 'webdev' | 'general' | 'local' | 'safety';
  active: boolean;
  createdAt: string;
}

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

export interface GlobalSettings {
  carouselSlideDurationMs: number;
  carouselTransition: 'fade' | 'slide';
  resetTimeHour: number;
  rssRefreshIntervalMin: number;
  rssScrollSpeed: 'slow' | 'medium' | 'fast';
  rssEnabled: boolean;
  rssRibbonColor: string;
  wifiSsid: string;
  wifiPassword: string;
  contacts: Contact[];
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  carouselSlideDurationMs: 6000,
  carouselTransition: 'slide',
  resetTimeHour: 22,
  rssRefreshIntervalMin: 15,
  rssScrollSpeed: 'medium',
  rssEnabled: true,
  rssRibbonColor: '#1a3a2a',
  wifiSsid: 'EQC-network',
  wifiPassword: '',
  contacts: [],
};
