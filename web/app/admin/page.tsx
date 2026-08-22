'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createEvent,
  createStation,
  createWard,
  listEvents,
  listStations,
  listWards,
  updateEventTitle,
} from '@/lib/data';
import type { EventRow, StationRow, WardRow } from '@/lib/types';
import { Card, Label, PageWrap, PrimaryButton, SecondaryButton, TextInput, TopNav } from '@/components/ui';
import { renderQrToCanvas } from '@/lib/qr';

function QrCanvas({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderQrToCanvas(ref.current, url, 160);
  }, [url]);
  return <canvas ref={ref} className="border border-slate-200 rounded-lg" />;
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [wards, setWards] = useState<WardRow[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newStation, setNewStation] = useState('');
  const [newWard, setNewWard] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  async function reload() {
    const evs = await listEvents();
    setEvents(evs);
    if (selected) {
      const still = evs.find((e) => e.id === selected.id);
      if (still) selectEvent(still);
    }
  }

  async function selectEvent(ev: EventRow) {
    setSelected(ev);
    setEditTitle(ev.title);
    const [st, wd] = await Promise.all([listStations(ev.id), listWards(ev.id)]);
    setStations(st);
    setWards(wd);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageWrap wide>
      <TopNav current="/admin" />
      <h1 className="text-xl font-bold mb-4">Admin — Events, Stations &amp; Wards</h1>

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
            <PrimaryButton
              className="mt-4"
              onClick={async () => {
                if (!newTitle.trim()) return;
                const ev = await createEvent(newTitle.trim(), newDate);
                setNewTitle('');
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
                  {ev.title}
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
              <p className="text-slate-500 text-sm">Select or create an event to configure its stations and wards.</p>
            </Card>
          )}

          {selected && (
            <>
              <Card>
                <h2 className="font-bold text-sm mb-2">Event title</h2>
                <div className="flex gap-2">
                  <TextInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <SecondaryButton
                    className="w-auto px-4 flex-shrink-0"
                    onClick={async () => {
                      await updateEventTitle(selected.id, editTitle);
                      reload();
                    }}
                  >
                    Save
                  </SecondaryButton>
                </div>
                <p className="text-xs text-slate-400 mt-3">Event ID (use in links): <code>{selected.id}</code></p>
              </Card>

              <Card>
                <h2 className="font-bold text-sm mb-3">Stations</h2>
                <div className="flex gap-2 mb-4">
                  <TextInput value={newStation} onChange={(e) => setNewStation(e.target.value)} placeholder="e.g. Front Gate" />
                  <SecondaryButton
                    className="w-auto px-4 flex-shrink-0"
                    onClick={async () => {
                      if (!newStation.trim()) return;
                      await createStation(selected.id, newStation.trim());
                      setNewStation('');
                      selectEvent(selected);
                    }}
                  >
                    Add
                  </SecondaryButton>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {stations.map((s) => {
                    const stationUrl = `${origin}/checkin?event=${selected.id}&station=${s.id}`;
                    return (
                      <div key={s.id} className="border border-slate-200 rounded-xl p-3 text-center">
                        <div className="font-semibold text-sm mb-2">{s.name}</div>
                        {origin && <QrCanvas url={stationUrl} />}
                        <div className="text-[10px] text-slate-400 mt-2 break-all">{stationUrl}</div>
                        <div className="flex gap-2 mt-2">
                          <a href={`/checkin?event=${selected.id}&station=${s.id}`} className="text-xs text-blue-700 underline flex-1">Check-in</a>
                          <a href={`/station?event=${selected.id}&station=${s.id}`} className="text-xs text-blue-700 underline flex-1">Usher</a>
                        </div>
                      </div>
                    );
                  })}
                  {stations.length === 0 && <p className="text-slate-400 text-sm">No stations yet.</p>}
                </div>
              </Card>

              <Card>
                <h2 className="font-bold text-sm mb-3">Wards</h2>
                <div className="flex gap-2 mb-4">
                  <TextInput value={newWard} onChange={(e) => setNewWard(e.target.value)} placeholder="e.g. Ikeja Ward" />
                  <SecondaryButton
                    className="w-auto px-4 flex-shrink-0"
                    onClick={async () => {
                      if (!newWard.trim()) return;
                      await createWard(selected.id, newWard.trim(), wards.length);
                      setNewWard('');
                      selectEvent(selected);
                    }}
                  >
                    Add
                  </SecondaryButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wards.map((w) => (
                    <span key={w.id} className="text-xs font-semibold bg-slate-100 text-slate-600 rounded-full px-3 py-1">
                      {w.name}
                    </span>
                  ))}
                  {wards.length === 0 && <p className="text-slate-400 text-sm">No wards yet.</p>}
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
    </PageWrap>
  );
}
