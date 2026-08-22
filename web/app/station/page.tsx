'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParam } from '@/lib/hooks';
import { getEventContext, getEventTotals, insertCheckin } from '@/lib/data';
import type { EventRow, EventTotalsRow, StationRow, WardRow } from '@/lib/types';
import { Card, Label, PageWrap, PrimaryButton, SecondaryButton, StatTile, TextInput, ToggleButton, TopNav } from '@/components/ui';

type Stage = 'loading' | 'no-event' | 'pick-station' | 'main';
type EntryType = 'individual' | 'family' | 'guest';

function StationInner() {
  const eventParam = useParam('event');
  const stationParam = useParam('station');

  const [stage, setStage] = useState<Stage>('loading');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [wards, setWards] = useState<WardRow[]>([]);
  const [station, setStation] = useState<StationRow | null>(null);
  const [totals, setTotals] = useState<EventTotalsRow | null>(null);

  const [entryType, setEntryType] = useState<EntryType>('individual');
  const [selectedWard, setSelectedWard] = useState<WardRow | null>(null);
  const [indName, setIndName] = useState('');
  const [famName, setFamName] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestInvitedBy, setGuestInvitedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshTotals = useCallback(async (ev: EventRow, st: StationRow) => {
    const all = await getEventTotals(ev.id);
    setTotals(all.find((t) => t.station_id === st.id) ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      if (!eventParam) return setStage('no-event');
      const { event: ev, stations: st, wards: wd } = await getEventContext(eventParam);
      if (!ev) return setStage('no-event');
      setEvent(ev);
      setStations(st);
      setWards(wd);

      let chosen: StationRow | null = null;
      if (stationParam) chosen = st.find((s) => s.id === stationParam || s.name === stationParam) ?? null;
      if (chosen || st.length === 1) {
        const use = chosen ?? st[0];
        setStation(use);
        setStage('main');
        refreshTotals(ev, use);
      } else {
        setStage('pick-station');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventParam, stationParam]);

  function resetForm() {
    setIndName('');
    setFamName('');
    setPartySize(1);
    setGuestName('');
    setGuestPhone('');
    setGuestAddress('');
    setGuestInvitedBy('');
    setSelectedWard(null);
    setEntryType('individual');
  }

  async function submit() {
    if (!event || !station) return;
    let payload: Parameters<typeof insertCheckin>[0] | null = null;

    if (entryType === 'individual') {
      payload = {
        event_id: event.id,
        station_id: station.id,
        method: 'form',
        entry_type: 'individual',
        adult_name: indName.trim() || null,
        ward_id: selectedWard?.id ?? null,
        total_count: 1,
      };
    } else if (entryType === 'family') {
      if (!famName.trim()) return setToast("Enter the adult's name");
      payload = {
        event_id: event.id,
        station_id: station.id,
        method: 'form',
        entry_type: 'family',
        adult_name: famName.trim(),
        ward_id: selectedWard?.id ?? null,
        party_size: partySize,
        total_count: partySize,
      };
    } else {
      if (!guestName.trim()) return setToast("Enter the guest's name");
      if (!guestPhone.trim() && !guestAddress.trim()) return setToast('Enter a phone number or address');
      payload = {
        event_id: event.id,
        station_id: station.id,
        method: 'form',
        entry_type: 'guest',
        adult_name: guestName.trim(),
        phone: guestPhone.trim() || null,
        address: guestAddress.trim() || null,
        invited_by: guestInvitedBy.trim() || null,
        total_count: 1,
      };
    }

    setBusy(true);
    try {
      await insertCheckin(payload);
      setToast(entryType === 'individual' ? 'Checked in' : entryType === 'family' ? 'Family checked in' : 'Guest checked in');
      resetForm();
      refreshTotals(event, station);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Error — try again');
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1800);
    }
  }

  if (stage === 'loading') return <PageWrap><p className="text-slate-500">Loading…</p></PageWrap>;
  if (stage === 'no-event') {
    return (
      <PageWrap>
        <p className="text-slate-600">
          Add <code>?event=EVENT_ID</code> to the URL, or pick one from{' '}
          <a href="/" className="text-blue-700 underline">the home page</a>.
        </p>
      </PageWrap>
    );
  }
  if (stage === 'pick-station') {
    return (
      <PageWrap>
        <h1 className="text-xl font-bold mb-3">{event?.title} — pick a station</h1>
        <div className="grid gap-2">
          {stations.map((s) => (
            <SecondaryButton key={s.id} onClick={() => { setStation(s); setStage('main'); refreshTotals(event!, s); }}>
              {s.name}
            </SecondaryButton>
          ))}
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <TopNav current="/station" />
      <h1 className="text-xl font-bold mb-1">Usher Check-In</h1>
      <p className="text-slate-500 text-sm mb-4">
        {event?.title} · <span className="font-semibold text-blue-700">{station?.name}</span>
      </p>

      <Card>
        <div className="flex gap-2 mb-3">
          <ToggleButton active={entryType === 'individual'} onClick={() => setEntryType('individual')}>Individual</ToggleButton>
          <ToggleButton active={entryType === 'family'} onClick={() => setEntryType('family')}>Family</ToggleButton>
          {event?.is_main_conference && (
            <ToggleButton active={entryType === 'guest'} onClick={() => setEntryType('guest')}>Guest</ToggleButton>
          )}
        </div>

        {(entryType === 'individual' || entryType === 'family') && (
          <>
            <Label>Ward (optional)</Label>
            <div className="grid grid-cols-2 gap-1.5 mb-1">
              {wards.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWard(selectedWard?.id === w.id ? null : w)}
                  className={`rounded-lg border text-xs font-semibold py-2 px-1 ${
                    selectedWard?.id === w.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </>
        )}

        {entryType === 'individual' && (
          <>
            <Label>Name (optional)</Label>
            <TextInput value={indName} onChange={(e) => setIndName(e.target.value)} placeholder="Optional" />
          </>
        )}

        {entryType === 'family' && (
          <>
            <Label>Name (one household member is fine)</Label>
            <TextInput value={famName} onChange={(e) => setFamName(e.target.value)} placeholder="e.g. Sister Adeyemi" />
            <Label>How many are here? (including this person)</Label>
            <div className="flex items-center gap-2">
              <button className="w-11 h-11 rounded-lg border border-slate-300 text-lg" onClick={() => setPartySize((n) => Math.max(1, n - 1))}>−</button>
              <input className="w-16 text-center rounded-lg border border-slate-300 py-2.5" value={partySize} readOnly />
              <button className="w-11 h-11 rounded-lg border border-slate-300 text-lg" onClick={() => setPartySize((n) => n + 1)}>+</button>
            </div>
          </>
        )}

        {entryType === 'guest' && (
          <>
            <Label>Guest&apos;s name</Label>
            <TextInput value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. John Smith" />
            <Label>Phone</Label>
            <TextInput value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Optional if address given" />
            <Label>Address</Label>
            <TextInput value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} placeholder="Optional if phone given" />
            <Label>Invited by (optional)</Label>
            <TextInput value={guestInvitedBy} onChange={(e) => setGuestInvitedBy(e.target.value)} placeholder="Leave blank if they came alone" />
          </>
        )}

        <PrimaryButton className="mt-5" disabled={busy} onClick={submit}>
          Check In
        </PrimaryButton>
      </Card>

      {totals && (
        <Card className="mt-4">
          <div className="text-3xl font-extrabold text-blue-700 tabular-nums">{totals.total_people}</div>
          <div className="text-xs text-slate-500 mb-3">people checked in so far at {station?.name}</div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile n={totals.individuals} label="Individuals" />
            <StatTile n={totals.families} label="Families" />
            <StatTile n={totals.guests} label="Guests" />
          </div>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </PageWrap>
  );
}

export default function StationPage() {
  return (
    <Suspense fallback={<PageWrap><p className="text-slate-500">Loading…</p></PageWrap>}>
      <StationInner />
    </Suspense>
  );
}
