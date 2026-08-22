'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useParam } from '@/lib/hooks';
import {
  getEvent,
  getEventTotals,
  getFullCheckins,
  getMethodTotals,
  getWardTotals,
  listCheckinEventsRaw,
  listEvents,
} from '@/lib/data';
import type { EventRow, EventTotalsRow, FullCheckinRow, MethodTotalsRow, WardTotalsRow } from '@/lib/types';
import { Card, EventPicker, Label, PageWrap, PrimaryButton, SecondaryButton, StatTile, TextInput, TopNav } from '@/components/ui';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

function ReportsInner() {
  const eventParam = useParam('event');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [compareId, setCompareId] = useState<string>('');
  const [compareEvent, setCompareEvent] = useState<EventRow | null>(null);

  const [totals, setTotals] = useState<EventTotalsRow[]>([]);
  const [wardTotals, setWardTotals] = useState<WardTotalsRow[]>([]);
  const [methodTotals, setMethodTotals] = useState<MethodTotalsRow[]>([]);
  const [compareTotals, setCompareTotals] = useState<EventTotalsRow[]>([]);
  const [timeline, setTimeline] = useState<{ time: string; count: number }[]>([]);

  const [pin, setPin] = useState('');
  const [guests, setGuests] = useState<FullCheckinRow[] | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  useEffect(() => {
    (async () => {
      if (!eventParam) return;
      const ev = await getEvent(eventParam);
      setEvent(ev);
      if (!ev) return;
      const [t, w, m, raw] = await Promise.all([
        getEventTotals(ev.id),
        getWardTotals(ev.id),
        getMethodTotals(ev.id),
        listCheckinEventsRaw(ev.id),
      ]);
      setTotals(t);
      setWardTotals(w);
      setMethodTotals(m);
      setTimeline(bucketByTime(raw.map((r) => r.created_at)));
    })();
  }, [eventParam]);

  useEffect(() => {
    (async () => {
      if (!compareId) {
        setCompareEvent(null);
        setCompareTotals([]);
        return;
      }
      const ev = await getEvent(compareId);
      setCompareEvent(ev);
      if (ev) setCompareTotals(await getEventTotals(ev.id));
    })();
  }, [compareId]);

  const grandTotal = totals.reduce((s, t) => s + Number(t.total_people), 0);
  const grandIndividuals = totals.reduce((s, t) => s + Number(t.individuals), 0);
  const grandFamilies = totals.reduce((s, t) => s + Number(t.families), 0);
  const grandGuests = totals.reduce((s, t) => s + Number(t.guests), 0);
  const compareGrandTotal = compareTotals.reduce((s, t) => s + Number(t.total_people), 0);

  const entryTypeData = [
    { name: 'Individuals', value: grandIndividuals },
    { name: 'Families', value: grandFamilies },
    { name: 'Guests', value: grandGuests },
  ].filter((d) => d.value > 0);

  const comparisonData = event
    ? [
        { name: event.title, total: grandTotal },
        ...(compareEvent ? [{ name: compareEvent.title, total: compareGrandTotal }] : []),
      ]
    : [];

  async function unlockGuests() {
    if (!event || !pin.trim()) return;
    setPinBusy(true);
    setPinError(null);
    try {
      const rows = await getFullCheckins(pin.trim(), event.id);
      setGuests(rows.filter((r) => r.entry_type === 'guest'));
    } catch (e) {
      setPinError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setPinBusy(false);
    }
  }

  if (!eventParam) {
    return (
      <PageWrap wide>
        <TopNav current="/reports" />
        <EventPicker linkTo={(id) => `/reports?event=${id}`} />
      </PageWrap>
    );
  }

  return (
    <PageWrap wide>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="no-print">
        <TopNav current="/reports" />
      </div>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{event?.title} — Report</h1>
        <SecondaryButton className="w-auto px-4 no-print" onClick={() => window.print()}>
          Print / Save as PDF
        </SecondaryButton>
      </div>
      <p className="text-slate-400 text-xs mb-5">{event?.event_date}</p>

      <Card className="print-card">
        <div className="text-4xl font-extrabold text-blue-700 tabular-nums">{grandTotal}</div>
        <div className="text-sm text-slate-500 mb-4">total people</div>
        <div className="grid grid-cols-3 gap-3">
          <StatTile n={grandIndividuals} label="Individuals" />
          <StatTile n={grandFamilies} label="Families" />
          <StatTile n={grandGuests} label="Guests/Investigators" />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card className="print-card">
          <h2 className="font-bold text-sm mb-3">People by ward</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={wardTotals} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="ward_name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total_people" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="print-card">
          <h2 className="font-bold text-sm mb-3">Individual / Family / Guest split</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={entryTypeData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {entryTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="print-card">
          <h2 className="font-bold text-sm mb-3">Check-ins over time</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="print-card">
          <h2 className="font-bold text-sm mb-3">By method</h2>
          <div className="space-y-2 mt-1">
            {methodTotals.map((m) => (
              <div key={m.method} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 capitalize">{m.method.replace('_', ' ')}</span>
                <span className="font-bold tabular-nums">{m.total_checkins}</span>
              </div>
            ))}
            {methodTotals.length === 0 && <p className="text-slate-400 text-sm">No check-ins yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-4 no-print">
        <h2 className="font-bold text-sm mb-2">Compare with another session</h2>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={compareId}
          onChange={(e) => setCompareId(e.target.value)}
        >
          <option value="">— pick a session to compare —</option>
          {events.filter((e) => e.id !== event?.id).map((e) => (
            <option key={e.id} value={e.id}>{e.title} — {e.event_date}</option>
          ))}
        </select>
      </Card>

      {compareEvent && (
        <Card className="mt-4 print-card">
          <h2 className="font-bold text-sm mb-3">
            {event?.title} vs {compareEvent.title}
          </h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="mt-4 print-card">
        <h2 className="font-bold text-sm mb-1">Guest / investigator follow-up sheet</h2>
        <p className="text-xs text-slate-400 mb-4 no-print">PIN-protected</p>
        {!guests ? (
          <div className="no-print max-w-xs mx-auto py-2">
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && unlockGuests()}
              placeholder="Enter PIN"
              className="text-center text-lg tracking-widest"
            />
            <PrimaryButton className="mt-3" onClick={unlockGuests} disabled={pinBusy}>
              {pinBusy ? 'Checking…' : 'Unlock'}
            </PrimaryButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2 min-w-[600px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs border-b">
                  <th className="py-1.5 pr-2">Name</th>
                  <th className="py-1.5 pr-2">Phone</th>
                  <th className="py-1.5 pr-2">Address</th>
                  <th className="py-1.5 pr-2">Invited by</th>
                  <th className="py-1.5 pr-2">Station</th>
                  <th className="py-1.5">Time</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 font-medium">{g.adult_name}</td>
                    <td className="py-1.5 pr-2">{g.phone}</td>
                    <td className="py-1.5 pr-2">{g.address}</td>
                    <td className="py-1.5 pr-2">{g.invited_by || '(came on their own)'}</td>
                    <td className="py-1.5 pr-2">{g.station_name}</td>
                    <td className="py-1.5">{new Date(g.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {guests.length === 0 && (
                  <tr><td colSpan={6} className="py-3 text-slate-400">No guests/investigators logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {pinError && <p className="text-red-600 text-sm mt-2 no-print">{pinError}</p>}
      </Card>
    </PageWrap>
  );
}

function bucketByTime(timestamps: string[]): { time: string; count: number }[] {
  if (timestamps.length === 0) return [];
  const bucketMs = 15 * 60 * 1000;
  const buckets = new Map<number, number>();
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    const bucket = Math.floor(t / bucketMs) * bucketMs;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({
      time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count,
    }));
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageWrap wide><p className="text-slate-500">Loading…</p></PageWrap>}>
      <ReportsInner />
    </Suspense>
  );
}
