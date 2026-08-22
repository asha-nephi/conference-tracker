'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParam } from '@/lib/hooks';
import { getEventContext, insertCheckin } from '@/lib/data';
import type { EventRow, StationRow, WardRow } from '@/lib/types';
import { Card, Label, PageWrap, PrimaryButton, SecondaryButton, TextInput, ToggleButton } from '@/components/ui';

type Stage = 'loading' | 'no-event' | 'pick-station' | 'main';
type MemberMode = null | 'individual' | 'family';

function CheckinInner() {
  const eventParam = useParam('event');
  const stationParam = useParam('station');

  const [stage, setStage] = useState<Stage>('loading');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [wards, setWards] = useState<WardRow[]>([]);
  const [station, setStation] = useState<StationRow | null>(null);

  const [showGuest, setShowGuest] = useState(false);
  const [selectedWard, setSelectedWard] = useState<WardRow | null>(null);
  const [memberMode, setMemberMode] = useState<MemberMode>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [famName, setFamName] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestInvitedBy, setGuestInvitedBy] = useState('');

  useEffect(() => {
    (async () => {
      if (!eventParam) {
        setStage('no-event');
        return;
      }
      const { event: ev, stations: st, wards: wd } = await getEventContext(eventParam);
      if (!ev) {
        setStage('no-event');
        return;
      }
      setEvent(ev);
      setStations(st);
      setWards(wd);

      let chosen: StationRow | null = null;
      if (stationParam) chosen = st.find((s) => s.id === stationParam || s.name === stationParam) ?? null;
      if (chosen) {
        setStation(chosen);
        checkLock(ev.id, chosen.id);
      } else if (st.length === 1) {
        setStation(st[0]);
        checkLock(ev.id, st[0].id);
      } else {
        setStage('pick-station');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventParam, stationParam]);

  function lockKey(eventId: string) {
    return `conferenceCheckedIn_${eventId}`;
  }

  function checkLock(eventId: string, _stationId: string) {
    if (typeof window !== 'undefined' && localStorage.getItem(lockKey(eventId))) {
      setDone("You've already checked in for this session. Thank you!");
    }
    setStage('main');
  }

  async function submit(fields: Partial<Parameters<typeof insertCheckin>[0]>) {
    if (!event || !station) return;
    setBusy(true);
    setError(null);
    try {
      await insertCheckin({
        event_id: event.id,
        station_id: station.id,
        method: 'qr_self',
        entry_type: 'individual',
        party_size: 1,
        total_count: 1,
        ...fields,
      });
      if (typeof window !== 'undefined') localStorage.setItem(lockKey(event.id), '1');
      setDone("You're checked in. Thank you!");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong, please try again');
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'loading') {
    return (
      <PageWrap>
        <p className="text-slate-500">Loading…</p>
      </PageWrap>
    );
  }

  if (stage === 'no-event') {
    return (
      <PageWrap>
        <Card>
          <p className="text-slate-600">
            This link is missing a valid event. Ask an usher for the correct QR code, or visit{' '}
            <a href="/" className="text-blue-700 underline">the home page</a>.
          </p>
        </Card>
      </PageWrap>
    );
  }

  if (stage === 'pick-station') {
    return (
      <PageWrap>
        <h1 className="text-xl font-bold mb-1">{event?.title}</h1>
        <p className="text-slate-500 text-sm mb-4">Which entrance are you at?</p>
        <div className="grid grid-cols-1 gap-2">
          {stations.map((s) => (
            <SecondaryButton key={s.id} onClick={() => { setStation(s); checkLock(event!.id, s.id); }}>
              {s.name}
            </SecondaryButton>
          ))}
        </div>
      </PageWrap>
    );
  }

  if (done) {
    return (
      <PageWrap>
        <Card className="text-center py-10">
          <div className="text-6xl font-extrabold text-green-600 mb-2">✓</div>
          <div className="text-slate-600 font-medium">{done}</div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <h1 className="text-xl font-bold mb-1">Welcome!</h1>
      <p className="text-slate-500 text-sm mb-5">
        {event?.title} · {station?.name}
      </p>

      {!showGuest && (
        <>
          {event?.is_main_conference && (
            <>
              <PrimaryButton className="py-6 text-lg" onClick={() => setShowGuest(true)}>
                I&apos;m not a member
              </PrimaryButton>
              <div className="text-center text-xs text-slate-400 uppercase tracking-wide my-4">
                or, if you&apos;re a member
              </div>
            </>
          )}

          <Card>
            {!selectedWard ? (
              <>
                <p className="text-slate-500 text-sm mb-2">Which ward are you from?</p>
                <div className="grid grid-cols-2 gap-2">
                  {wards.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWard(w)}
                      className="rounded-lg border-2 border-blue-600 text-blue-700 text-sm font-semibold py-2.5 px-1.5 hover:bg-blue-50"
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-3">{selectedWard.name}</p>
                <div className="flex gap-2 mb-3">
                  <ToggleButton
                    active={memberMode === 'individual'}
                    onClick={() => {
                      setMemberMode('individual');
                      submit({ entry_type: 'individual', ward_id: selectedWard.id });
                    }}
                    disabled={busy}
                  >
                    Individual
                  </ToggleButton>
                  <ToggleButton active={memberMode === 'family'} onClick={() => setMemberMode('family')} disabled={busy}>
                    Family / with kids
                  </ToggleButton>
                </div>

                {memberMode === 'family' && (
                  <div>
                    <Label>Name (one household member is fine)</Label>
                    <TextInput value={famName} onChange={(e) => setFamName(e.target.value)} placeholder="e.g. Brother Okafor" />
                    <Label>How many of you are here? (including you)</Label>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-11 h-11 rounded-lg border border-slate-300 text-lg"
                        onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                      >
                        −
                      </button>
                      <input
                        className="w-16 text-center rounded-lg border border-slate-300 py-2.5"
                        value={partySize}
                        readOnly
                      />
                      <button
                        className="w-11 h-11 rounded-lg border border-slate-300 text-lg"
                        onClick={() => setPartySize((n) => n + 1)}
                      >
                        +
                      </button>
                    </div>
                    <PrimaryButton
                      className="mt-4"
                      disabled={busy}
                      onClick={() => {
                        if (!famName.trim()) return setError('Please enter a name');
                        submit({
                          entry_type: 'family',
                          adult_name: famName.trim(),
                          ward_id: selectedWard.id,
                          party_size: partySize,
                          total_count: partySize,
                        });
                      }}
                    >
                      Check In
                    </PrimaryButton>
                  </div>
                )}

                <SecondaryButton className="mt-3" onClick={() => { setSelectedWard(null); setMemberMode(null); }}>
                  Change ward
                </SecondaryButton>
              </>
            )}
          </Card>
        </>
      )}

      {showGuest && (
        <Card>
          <p className="text-slate-500 text-sm mb-3">
            So glad you&apos;re here! It&apos;s totally fine if you came on your own.
          </p>
          <Label>Your name</Label>
          <TextInput value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. John Smith" />
          <Label>Phone</Label>
          <TextInput value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Optional if address given" />
          <Label>Address</Label>
          <TextInput value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} placeholder="Optional if phone given" />
          <Label>Who invited you? (optional)</Label>
          <TextInput value={guestInvitedBy} onChange={(e) => setGuestInvitedBy(e.target.value)} placeholder="Leave blank if no one did" />
          <PrimaryButton
            className="mt-4"
            disabled={busy}
            onClick={() => {
              if (!guestName.trim()) return setError('Please enter your name');
              if (!guestPhone.trim() && !guestAddress.trim()) return setError('Please enter a phone number or address');
              submit({
                entry_type: 'guest',
                adult_name: guestName.trim(),
                phone: guestPhone.trim() || null,
                address: guestAddress.trim() || null,
                invited_by: guestInvitedBy.trim() || null,
              });
            }}
          >
            Check In
          </PrimaryButton>
          <SecondaryButton className="mt-2" onClick={() => setShowGuest(false)}>
            Back
          </SecondaryButton>
        </Card>
      )}

      {error && <p className="text-red-600 font-medium text-sm text-center mt-3">{error}</p>}
    </PageWrap>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<PageWrap><p className="text-slate-500">Loading…</p></PageWrap>}>
      <CheckinInner />
    </Suspense>
  );
}
