export interface RiderProfile {
  index: number;
  id: string;
  name: string;
  title: string;
  bikeName: string;
  bikeType: 'vespa' | 'sport-moped' | 'cargo-trike' | 'cruiser' | 'cafe-racer';
  plateNumber: string;
  cityHub: string;
  helmetColor: string;
  helmetAccent: string;
  jacketColor: string;
  jacketTrim: string;
  bikePrimary: string;
  bikeSecondary: string;
  skinTone: string;
  hairColor: string;
  badgeText: string;
  catchphrase: string;
}

export const RIDER_ROSTER: RiderProfile[] = [
  {
    index: 0,
    id: 'aarav',
    name: 'Aarav Sharma',
    title: 'Emerald Express Rider',
    bikeName: 'VoltMint Classic E-Scooter',
    bikeType: 'vespa',
    plateNumber: 'KA-01-FC-01',
    cityHub: 'Bengaluru Indiranagar Hub',
    helmetColor: '#059669',
    helmetAccent: '#A7F3D0',
    jacketColor: '#10B981',
    jacketTrim: '#064E3B',
    bikePrimary: '#10B981',
    bikeSecondary: '#34D399',
    skinTone: '#F6C29F',
    hairColor: '#1E293B',
    badgeText: 'Boy 1 · Mint E-Scooter',
    catchphrase: 'Fresh sabzi & doodh arriving in 20 mins!',
  },
  {
    index: 1,
    id: 'kabir',
    name: 'Kabir Verma',
    title: 'Saffron Turbo Sprinter',
    bikeName: 'Agni Sport Delivery Moped',
    bikeType: 'sport-moped',
    plateNumber: 'MH-02-FC-02',
    cityHub: 'Mumbai Bandra West Hub',
    helmetColor: '#EA580C',
    helmetAccent: '#FED7AA',
    jacketColor: '#F97316',
    jacketTrim: '#7C2D12',
    bikePrimary: '#F97316',
    bikeSecondary: '#FACC15',
    skinTone: '#E8AC82',
    hairColor: '#0F172A',
    badgeText: 'Boy 2 · Saffron Moped',
    catchphrase: 'Zero traffic stops this fresh basket!',
  },
  {
    index: 2,
    id: 'rohan',
    name: 'Rohan Nair',
    title: 'Coastal Cargo Specialist',
    bikeName: 'Neela Sky Cargo Trike',
    bikeType: 'cargo-trike',
    plateNumber: 'TN-09-FC-03',
    cityHub: 'Chennai Adyar Fresh Hub',
    helmetColor: '#0284C7',
    helmetAccent: '#BAE6FD',
    jacketColor: '#0EA5E9',
    jacketTrim: '#0C4A6E',
    bikePrimary: '#0EA5E9',
    bikeSecondary: '#38BDF8',
    skinTone: '#D4926A',
    hairColor: '#18181B',
    badgeText: 'Boy 3 · Sky Cargo Trike',
    catchphrase: 'Big family ration packs? Easy load!',
  },
  {
    index: 3,
    id: 'vikram',
    name: 'Vikram Patel',
    title: 'Highway Cruiser Captain',
    bikeName: 'Surya Crimson E-Cruiser',
    bikeType: 'cruiser',
    plateNumber: 'GJ-01-FC-04',
    cityHub: 'Ahmedabad Navrangpura Hub',
    helmetColor: '#E11D48',
    helmetAccent: '#FECDD3',
    jacketColor: '#F43F5E',
    jacketTrim: '#881337',
    bikePrimary: '#E11D48',
    bikeSecondary: '#FB7185',
    skinTone: '#F1BA92',
    hairColor: '#27272A',
    badgeText: 'Boy 4 · Crimson E-Cruiser',
    catchphrase: 'Spices, atta & ghee sealed with care!',
  },
  {
    index: 4,
    id: 'dev',
    name: 'Dev Deshmukh',
    title: 'Midnight & Dawn Pilot',
    bikeName: 'Indigo Café E-Racer',
    bikeType: 'cafe-racer',
    plateNumber: 'DL-03-FC-05',
    cityHub: 'New Delhi Connaught Hub',
    helmetColor: '#7C3AED',
    helmetAccent: '#DDD6FE',
    jacketColor: '#8B5CF6',
    jacketTrim: '#4C1D95',
    bikePrimary: '#7C3AED',
    bikeSecondary: '#A78BFA',
    skinTone: '#F4C5A3',
    hairColor: '#1C1917',
    badgeText: 'Boy 5 · Violet Café E-Racer',
    catchphrase: 'Superfast morning milk & bread express!',
  },
];

const LS_KEY = 'fc_active_rider_idx';
const SS_BOOT_KEY = 'fc_rider_rotated_on_open';

/**
 * Advances the active delivery boy & bike automatically on every fresh website open
 * looping 0 -> 1 -> 2 -> 3 -> 4 -> 0 cleanly across visits.
 */
export function resolveSessionRiderIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const current = raw !== null ? Number(raw) : -1;
    const validCurrent = Number.isInteger(current) && current >= 0 && current < RIDER_ROSTER.length ? current : -1;

    if (!window.sessionStorage.getItem(SS_BOOT_KEY)) {
      const nextIdx = (validCurrent + 1) % RIDER_ROSTER.length;
      window.localStorage.setItem(LS_KEY, String(nextIdx));
      window.sessionStorage.setItem(SS_BOOT_KEY, '1');
      return nextIdx;
    }

    return validCurrent >= 0 ? validCurrent : 0;
  } catch {
    return 0;
  }
}

export function setManualRiderIndex(idx: number): number {
  const safe = ((idx % RIDER_ROSTER.length) + RIDER_ROSTER.length) % RIDER_ROSTER.length;
  try {
    window.localStorage.setItem(LS_KEY, String(safe));
    window.sessionStorage.setItem(SS_BOOT_KEY, '1');
  } catch {
    // ignore storage errors
  }
  return safe;
}
