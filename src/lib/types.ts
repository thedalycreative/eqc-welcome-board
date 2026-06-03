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
  time?: string; // optional "HH:MM" 24-hour
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

export interface AnnouncementPlacements {
  top?: boolean;
  bottom?: boolean;
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
  placements?: AnnouncementPlacements; // default {top: true} for back-compat
}

export interface TrainerSocials {
  discord?: string;
  linkedin?: string;
  staffEmail?: string;
  github?: string;
}

export interface Trainer {
  id: string;
  name: string;
  photoUrl: string;
  bio?: string;
  quote?: string;
  active: boolean;
  createdAt: string;
  password?: string;          // login password (auto-gen as {Name}{N})
  originalPhotoUrl?: string;  // pre-crop source for re-crop in edit modal
  socials?: TrainerSocials;
}

export interface CarouselItem {
  id: string;
  imageUrl: string;
  caption?: string;
  order: number;
  createdAt: string;
  durationMs?: number;         // per-slide override of global default
  originalImageUrl?: string;   // pre-crop source for re-crop in edit modal
}

export interface SignOnLogEntry {
  id: string;
  trainerName: string;
  trainerId?: string;
  roomNumber: string;
  intakeNumber: string;
  course: string;
  topics?: string;             // course topic for the session
  action: 'sign-on' | 'sign-off' | 'reset';
  timestamp: string;
  breakMinutes?: number;       // duration of any break (15/30/45/60)
  signOffTimestamp?: string;   // matched sign-off if present
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

export interface FooterItem {
  id: string;
  icon: string;       // lucide icon name
  iconColor: string;  // hex color
  text: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: 'cafe' | 'transport' | 'other';
  walkMinutes?: number;
  address?: string;
  placeId?: string; // Google Places ID, reserved for future integration
}

export interface FloorPlanSettings {
  imageUrl: string;
  originalImageUrl?: string;
  hoverAnimation: boolean;
}

export type CarouselTransition = 'fade' | 'slide' | 'zoom' | 'crossfade' | 'kenburns';

export interface GlobalSettings {
  carouselSlideDurationMs: number;
  carouselTransition: CarouselTransition;
  resetTimeHour: number;
  rssRefreshIntervalMin: number;
  rssScrollSpeed: 'slow' | 'medium' | 'fast';
  rssEnabled: boolean;
  rssRibbonColor: string;
  wifiSsid: string;
  wifiPassword: string;
  contacts: Contact[];
  footerItems: FooterItem[];
  floorPlan: FloorPlanSettings;
  nearbyPlaces: NearbyPlace[];
}

export const DEFAULT_FOOTER_ITEMS: FooterItem[] = [
  { id: 'rto',       icon: 'Shield',           iconColor: '#1a7a54', text: 'RTO 45758' },
  { id: 'cricos',    icon: 'GraduationCap',    iconColor: '#1a7a54', text: 'CRICOS 03952E' },
  { id: 'address',   icon: 'MapPin',           iconColor: '#ef4444', text: '2 Gordon St, West Perth WA 6005' },
  { id: 'phone',     icon: 'Phone',            iconColor: '#1a7a54', text: '1800 338 883' },
  { id: 'email',     icon: 'Mail',             iconColor: '#1a7a54', text: 'team@equinimcollege.com' },
  { id: 'firstaid',  icon: 'BriefcaseMedical', iconColor: '#ef4444', text: 'First Aid: Kitchen' },
  { id: 'fire',      icon: 'Flame',            iconColor: '#f97316', text: 'Fire Assembly: Coolgardie St' },
  { id: 'lostfound', icon: 'PackageSearch',    iconColor: '#1a7a54', text: 'Lost & Found: Breakout area' },
];

export const DEFAULT_NEARBY_PLACES: NearbyPlace[] = [
  { id: 'gordon-st-garage',  name: 'Gordon St Garage',   category: 'cafe',      walkMinutes: 1 },
  { id: 'pony-express',      name: 'Pony Express',       category: 'cafe',      walkMinutes: 3 },
  { id: 'watertown-outlets', name: 'Watertown Outlets',  category: 'cafe',      walkMinutes: 5 },
  { id: 'city-west-station', name: 'City West Station',  category: 'transport', walkMinutes: 4 },
  { id: 'bus-routes',        name: 'Bus 81, 82, 83, 84', category: 'transport', walkMinutes: 2 },
  { id: 'yellow-cat-bus',    name: 'Yellow CAT Bus',     category: 'transport', walkMinutes: 3 },
];

export const DEFAULT_SETTINGS: GlobalSettings = {
  carouselSlideDurationMs: 10000,
  carouselTransition: 'slide',
  resetTimeHour: 22,
  rssRefreshIntervalMin: 15,
  rssScrollSpeed: 'medium',
  rssEnabled: true,
  rssRibbonColor: '#1a3a2a',
  wifiSsid: 'EQC-network',
  wifiPassword: '',
  contacts: [],
  footerItems: DEFAULT_FOOTER_ITEMS,
  floorPlan: {
    imageUrl: '/images/eqc-campus-layout.svg',
    hoverAnimation: true,
  },
  nearbyPlaces: DEFAULT_NEARBY_PLACES,
};
