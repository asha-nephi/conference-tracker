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

export async function createEvent(title: string, eventDate: string): Promise<EventRow> {
  const slug = `${eventDate}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from('events')
    .insert({ title, event_date: eventDate, slug })
    .select()
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function updateEventTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('events').update({ title }).eq('id', id);
  if (error) throw error;
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

export async function createStation(eventId: string, name: string): Promise<StationRow> {
  const { data, error } = await supabase
    .from('stations')
    .insert({ event_id: eventId, name })
    .select()
    .single();
  if (error) throw error;
  return data as StationRow;
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

export async function createWard(eventId: string, name: string, sortOrder: number): Promise<WardRow> {
  const { data, error } = await supabase
    .from('wards')
    .insert({ event_id: eventId, name, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as WardRow;
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
