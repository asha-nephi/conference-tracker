'use client';

import { useEffect, useRef, useState } from 'react';
import {
  adminCreateEvent,
  adminCreateStation,
  adminDeleteEvent,
  adminDeleteStation,
  adminDeleteWard,
  adminUpdateEvent,
  listEvents,
  listStations,
  listWards,
  verifyAdminPin,
} from '@/lib/data';
import type { EventRow, StationRow, WardRow } from '@/lib/types';
import { Badge, Card, Label, PageWrap, PrimaryButton, SecondaryButton, TextInput, TopNav } from '@/components/ui';
import { renderQrToCanvas } from '@/lib/qr';

const PIN_SESSION_KEY = 'conferenceAdminPin';

function QrCanvas({ url, size = 160 }: { url: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderQrToCanvas(ref.current, url, size);
  }, [url, size]);
  return <canvas ref={ref} className="border border-slate-200 rounded-lg max-w-full h-auto" />;
}

function AdminGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAdminPin(pin.trim());
      if (!ok) {
        setError('Wrong PIN');
        return;
      }
      sessionStorage.setItem(PIN_SESSION_KEY, pin.trim());
      onUnlock(pin.trim());
    } catch {
      setError('Could not verify PIN. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageWrap>
      <Card className="mt-10">
        <h1 className="text-lg font-bold mb-1">Admin access</h1>
        <p className="text-slate-500 text-sm mb-4">Enter the admin PIN to continue.</p>
        <TextInput
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="6-digit PIN"
          className="text-center text-lg tracking-widest"
        />
        <PrimaryButton className="mt-4" onClick={submit} disabled={busy}>
          Unlock
        </PrimaryButton>
        {error && <p className="text-red-600 text-sm text-center mt-3">{error}</p>}
      </Card>
    </PageWrap>
  );
}

export default function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(PIN_SESSION_KEY);
    if (stored) setPin(stored);
    setCheckedStorage(true);
  }, []);

  if (!checkedStorage) return null;
  if (!pin) return <AdminGate onUnlock={setPin} />;
  return <AdminPanel pin={pin} onLock={() => { sessionStorage.removeItem(PIN_SESSION_KEY); setPin(null); }} />;
}

function AdminPanel({ pin, onLock }: { pin: string; onLock: () => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [wards, setWards] = useState<WardRow[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newIsMain, setNewIsMain] = useState(false);
  const [newStation, setNewStation] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editIsMain, setEditIsMain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrStationId, setQrStationId] = useState<string | null>(null);

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  async function reload() {
    const evs = await listEvents();
    setEvents(evs);
    if (selected) {
      const still = evs.find((e) => e.id === selected.id);
      if (still) selectEvent(still);
      else setSelected(null);
    }
  }

  async function selectEvent(ev: EventRow) {
    setSelected(ev);
    setEditTitle(ev.title);
    setEditIsMain(ev.is_main_conference);
    const [st, wd] = await Promise.all([listStations(ev.id), listWards(ev.id)]);
    setStations(st);
    setWards(wd);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runOrReportPinError<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      if (msg === 'Wrong PIN') {
        setError('Your admin session expired. Please unlock again.');
        onLock();
      } else {
        setError(msg);
      }
      return undefined;
    }
  }

  async function addStation() {
    if (!selected || !newStation.trim()) return;
    const st = await runOrReportPinError(() => adminCreateStation(pin, selected.id, newStation.trim()));
    if (!st) return;
    setNewStation('');
    selectEvent(selected);
  }

  return (
    <PageWrap wide>
      <TopNav current="/admin" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <SecondaryButton className="w-auto px-4" onClick={onLock}>Lock</SecondaryButton>
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold text-sm mb-2">Create event</h2>
            <Label>Title</Label>
            <TextInput
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Saturday Session of Conference"
            />
            <Label>Date</Label>
            <TextInput type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <label className="flex items-center gap-2 mt-3.5 text-sm text-slate-700">
              <input type="checkbox" checked={newIsMain} onChange={(e) => setNewIsMain(e.target.checked)} className="w-4 h-4" />
              Main Conference (collects guest details)
            </label>
            <PrimaryButton
              className="mt-4"
              onClick={async () => {
                if (!newTitle.trim()) return;
                const ev = await runOrReportPinError(() => adminCreateEvent(pin, newTitle.trim(), newDate, newIsMain));
                if (!ev) return;
                setNewTitle('');
                setNewIsMain(false);
                await reload();
                selectEvent(ev);
              }}
            >
              Create event
            </PrimaryButton>
          </Card>

          <Card>
            <h2 className="font-bold text-sm mb-2">Events</h2>
            <div className="space-y-1.5">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => selectEvent(ev)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                    selected?.id === ev.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{ev.title}</span>
                    {ev.is_main_conference && <Badge tone="green">Main</Badge>}
                  </div>
                  <div className="text-xs text-slate-400">{ev.event_date}</div>
                </button>
              ))}
              {events.length === 0 && <p className="text-slate-400 text-sm">No events yet.</p>}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!selected && (
            <Card>
              <p className="text-slate-500 text-sm">Select or create an event to get started.</p>
            </Card>
          )}

          {selected && (
            <>
              <Card>
                <h2 className="font-bold text-sm mb-2">Event settings</h2>
                <Label>Title</Label>
                <TextInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <label className="flex items-center gap-2 mt-3.5 text-sm text-slate-700">
                  <input type="checkbox" checked={editIsMain} onChange={(e) => setEditIsMain(e.target.checked)} className="w-4 h-4" />
                  Main Conference (collects guest details)
                </label>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <SecondaryButton
                    onClick={async () => {
                      const ev = await runOrReportPinError(() => adminUpdateEvent(pin, selected.id, editTitle, editIsMain));
                      if (ev) reload();
                    }}
                  >
                    Save changes
                  </SecondaryButton>
                  <SecondaryButton
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm(`Delete "${selected.title}" and ALL its check-in data? This cannot be undone.`)) return;
                      const done = await runOrReportPinError(async () => { await adminDeleteEvent(pin, selected.id); return true; });
                      if (done) { setSelected(null); reload(); }
                    }}
                  >
                    Delete this session
                  </SecondaryButton>
                </div>
                <p className="text-xs text-slate-400 mt-3 break-all">ID: <code>{selected.id}</code></p>
              </Card>

              <Card>
                <h2 className="font-bold text-sm mb-3">Stations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-4">
                  <TextInput
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addStation()}
                    placeholder="e.g. Front Gate"
                  />
                  <PrimaryButton className="w-full sm:w-auto sm:px-6" onClick={addStation}>
                    Add
                  </PrimaryButton>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {stations.map((s) => {
                    const stationUrl = `${origin}/checkin?event=${selected.id}&station=${s.id}`;
                    return (
                      <div key={s.id} className="border border-slate-200 rounded-xl p-3 text-center">
                        <div className="font-semibold text-sm mb-2">{s.name}</div>
                        {origin && (
                          <button onClick={() => setQrStationId(s.id)} className="inline-block">
                            <QrCanvas url={stationUrl} />
                          </button>
                        )}
                        <div className="text-[10px] text-slate-400 mt-2 break-all">{stationUrl}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <a href={`/checkin?event=${selected.id}&station=${s.id}`} className="text-blue-700 underline">Check-in</a>
                          <a href={`/station?event=${selected.id}&station=${s.id}`} className="text-blue-700 underline">Usher</a>
                          <a href={`/qr?event=${selected.id}&station=${s.id}`} target="_blank" rel="noreferrer" className="text-blue-700 underline">Full-screen QR</a>
                          <button
                            className="text-red-600 underline text-left"
                            onClick={async () => {
                              if (!confirm(`Remove station "${s.name}"?`)) return;
                              const done = await runOrReportPinError(async () => { await adminDeleteStation(pin, s.id); return true; });
                              if (done) selectEvent(selected);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {stations.length === 0 && <p className="text-slate-400 text-sm">No stations yet.</p>}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-sm">Wards</h2>
                  <span className="text-xs text-slate-400">Auto-filled for Ikeja Stake</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wards.map((w) => (
                    <span key={w.id} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full pl-3 pr-1.5 py-1">
                      {w.name}
                      <button
                        title="Remove"
                        className="text-slate-400 hover:text-red-600 leading-none"
                        onClick={async () => {
                          const done = await runOrReportPinError(async () => { await adminDeleteWard(pin, w.id); return true; });
                          if (done) selectEvent(selected);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {wards.length === 0 && <p className="text-slate-400 text-sm">No wards on this session.</p>}
                </div>
              </Card>

              <Card>
                <h2 className="font-bold text-sm mb-2">Quick links</h2>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a className="text-blue-700 underline" href={`/dashboard?event=${selected.id}`}>Dashboard</a>
                  <a className="text-blue-700 underline" href={`/display?event=${selected.id}`}>Big-screen display</a>
                  <a className="text-blue-700 underline" href={`/reports?event=${selected.id}`}>Reports</a>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {qrStationId && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setQrStationId(null)}>
          <div className="bg-white rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <QrCanvas url={`${origin}/checkin?event=${selected.id}&station=${qrStationId}`} size={280} />
            <SecondaryButton className="mt-4" onClick={() => setQrStationId(null)}>Close</SecondaryButton>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
