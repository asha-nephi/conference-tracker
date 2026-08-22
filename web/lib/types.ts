export type EntryType = 'individual' | 'family' | 'guest';
export type CheckinMethod = 'form' | 'qr_self' | 'fingerprint';

export interface EventRow {
  id: string;
  title: string;
  event_date: string;
  slug: string;
  created_at: string;
  is_archived: boolean;
  is_main_conference: boolean;
}

export interface StationRow {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
}

export interface WardRow {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
}

export interface CheckinInput {
  event_id: string;
  station_id: string;
  method: CheckinMethod;
  entry_type: EntryType;
  adult_name?: string | null;
  phone?: string | null;
  address?: string | null;
  invited_by?: string | null;
  ward_id?: string | null;
  party_size?: number;
  total_count?: number;
}

export interface EventTotalsRow {
  station_id: string;
  station_name: string;
  total_people: number;
  total_checkins: number;
  individuals: number;
  families: number;
  guests: number;
}

export interface WardTotalsRow {
  ward_name: string;
  total_people: number;
}

export interface MethodTotalsRow {
  method: string;
  total_checkins: number;
}

export interface CheckinEventRow {
  id: string;
  event_id: string;
  station_id: string;
  entry_type: EntryType;
  total_count: number;
  created_at: string;
}

export interface FullCheckinRow {
  id: string;
  event_id: string;
  station_id: string;
  station_name: string;
  method: CheckinMethod;
  entry_type: EntryType;
  adult_name: string | null;
  phone: string | null;
  address: string | null;
  invited_by: string | null;
  ward_name: string | null;
  party_size: number;
  total_count: number;
  source: string;
  created_at: string;
}
