import { supabase } from './supabase';
import type {
  CheckinEventRow,
  CheckinInput,
  EventRow,
  EventTotalsRow,
  FullCheckinRow,
  MethodTotalsRow,
  StationRow,
  WardRow,
  WardTotalsRow,
} from './types';

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });
  if (error) throw error;
  return data as EventRow[];
}

export async function getEvent(idOrSlug: string): Promise<EventRow | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', idOrSlug)
    .maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

function pinError(error: { message: string }): Error {
  return new Error(error.message.includes('invalid pin') ? 'Wrong PIN' : error.message);
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_verify_pin', { p_pin: pin });
  if (error) throw error;
  return Boolean(data);
}

export async function adminCreateEvent(
  pin: string,
  title: string,
  eventDate: string,
  isMainConference: boolean
): Promise<EventRow> {
  const { data, error } = await supabase.rpc('admin_create_event', {
    p_pin: pin,
    p_title: title,
    p_event_date: eventDate,
    p_is_main_conference: isMainConference,
  });
  if (error) throw pinError(error);
  return data as EventRow;
}

export async function adminUpdateEvent(
  pin: string,
  eventId: string,
  title: string,
  isMainConference: boolean
): Promise<EventRow> {
  const { data, error } = await supabase.rpc('admin_update_event', {
    p_pin: pin,
    p_event_id: eventId,
    p_title: title,
    p_is_main_conference: isMainConference,
  });
  if (error) throw pinError(error);
  return data as EventRow;
}

export async function adminDeleteEvent(pin: string, eventId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_event', { p_pin: pin, p_event_id: eventId });
  if (error) throw pinError(error);
}

export async function adminCreateStation(pin: string, eventId: string, name: string): Promise<StationRow> {
  const { data, error } = await supabase.rpc('admin_create_station', { p_pin: pin, p_event_id: eventId, p_name: name });
  if (error) throw pinError(error);
  return data as StationRow;
}

export async function adminDeleteStation(pin: string, stationId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_station', { p_pin: pin, p_station_id: stationId });
  if (error) throw pinError(error);
}

export async function adminCreateWard(pin: string, eventId: string, name: string, sortOrder: number): Promise<WardRow> {
  const { data, error } = await supabase.rpc('admin_create_ward', { p_pin: pin, p_event_id: eventId, p_name: name, p_sort_order: sortOrder });
  if (error) throw pinError(error);
  return data as WardRow;
}

export async function adminDeleteWard(pin: string, wardId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_ward', { p_pin: pin, p_ward_id: wardId });
  if (error) throw pinError(error);
}

export async function listStations(eventId: string): Promise<StationRow[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');
  if (error) throw error;
  return data as StationRow[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// When the URL already carries the event's real UUID (true for every QR
// code, which encodes the id directly), the stations/wards queries don't
// need to wait for getEvent() to resolve first — they can use that UUID
// immediately. This cuts a full network round-trip off first paint on
// /checkin and /station, which matters more than usual given Supabase is
// in us-east-1 and most users here are in Lagos. Only falls back to the
// slower sequential path when given a slug instead of a UUID.
export async function getEventContext(
  idOrSlug: string
): Promise<{ event: EventRow | null; stations: StationRow[]; wards: WardRow[] }> {
  if (UUID_RE.test(idOrSlug)) {
    const [event, stations, wards] = await Promise.all([
      getEvent(idOrSlug),
      listStations(idOrSlug),
      listWards(idOrSlug),
    ]);
    return { event, stations, wards };
  }
  const event = await getEvent(idOrSlug);
  if (!event) return { event: null, stations: [], wards: [] };
  const [stations, wards] = await Promise.all([listStations(event.id), listWards(event.id)]);
  return { event, stations, wards };
}

export async function listWards(eventId: string): Promise<WardRow[]> {
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order');
  if (error) throw error;
  return data as WardRow[];
}

export async function insertCheckin(input: CheckinInput): Promise<void> {
  const { error } = await supabase.from('checkins').insert(input);
  if (error) throw error;
}

export async function getEventTotals(eventId: string): Promise<EventTotalsRow[]> {
  const { data, error } = await supabase.rpc('get_event_totals', { p_event_id: eventId });
  if (error) throw error;
  return data as EventTotalsRow[];
}

export async function getWardTotals(eventId: string): Promise<WardTotalsRow[]> {
  const { data, error } = await supabase.rpc('get_ward_totals', { p_event_id: eventId });
  if (error) throw error;
  return data as WardTotalsRow[];
}

export async function getMethodTotals(eventId: string): Promise<MethodTotalsRow[]> {
  const { data, error } = await supabase.rpc('get_method_totals', { p_event_id: eventId });
  if (error) throw error;
  return data as MethodTotalsRow[];
}

export async function listCheckinEventsRaw(eventId: string): Promise<CheckinEventRow[]> {
  const { data, error } = await supabase
    .from('checkin_events')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');
  if (error) throw error;
  return data as CheckinEventRow[];
}

export async function getFullCheckins(pin: string, eventId?: string): Promise<FullCheckinRow[]> {
  const { data, error } = await supabase.rpc('get_full_checkins', {
    p_pin: pin,
    p_event_id: eventId ?? null,
  });
  if (error) throw new Error(error.message.includes('invalid pin') ? 'Wrong PIN' : error.message);
  return data as FullCheckinRow[];
}

export function subscribeToCheckinEvents(
  eventId: string,
  onInsert: (row: CheckinEventRow) => void
) {
  const channel = supabase
    .channel(`checkin-events-${eventId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'v2', table: 'checkin_events', filter: `event_id=eq.${eventId}` },
      (payload) => onInsert(payload.new as CheckinEventRow)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
