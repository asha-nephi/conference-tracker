'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParam } from '@/lib/hooks';
import { getEvent, getEventTotals, getWardTotals, subscribeToCheckinEvents } from '@/lib/data';
import type { EventRow, EventTotalsRow, WardTotalsRow } from '@/lib/types';
import { Card, PageWrap, StatTile, TopNav } from '@/components/ui';

function DashboardInner() {
  const eventParam = useParam('event');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [totals, setTotals] = useState<EventTotalsRow[]>([]);
  const [wardTotals, setWardTotals] = useState<WardTotalsRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(async (eventId: string) => {
    const [t, w] = await Promise.all([getEventTotals(eventId), getWardTotals(eventId)]);
    setTotals(t);
    setWardTotals(w);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      if (!eventParam) return;
      const ev = await getEvent(eventParam);
      if (!ev || cancelled) return;
      setEvent(ev);
      await refresh(ev.id);
      if (cancelled) return;
      unsubscribe = subscribeToCheckinEvents(ev.id, () => {
        setConnected(true);
        refresh(ev.id);
      });
    })();

    // See app/display/page.tsx for why this can't just `return unsubscribe`
    // from inside the async IIFE — React needs the cleanup synchronously.
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [eventParam, refresh]);

  if (!eventParam) {
    return (
      <PageWrap wide>
        <TopNav current="/dashboard" />
        <p className="text-slate-600">
          Add <code>?event=EVENT_ID</code> to the URL, or pick one from{' '}
          <a href="/" className="text-blue-700 underline">the home page</a>.
        </p>
      </PageWrap>
    );
  }

  const grandTotal = totals.reduce((s, t) => s + Number(t.total_people), 0);
  const grandChecking = totals.reduce((s, t) => s + Number(t.total_checkins), 0);
  const grandIndividuals = totals.reduce((s, t) => s + Number(t.individuals), 0);
  const grandFamilies = totals.reduce((s, t) => s + Number(t.families), 0);
  const grandGuests = totals.reduce((s, t) => s + Number(t.guests), 0);

  return (
    <PageWrap wide>
      <TopNav current="/dashboard" />
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{event?.title}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${connected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {connected ? '● live' : 'connecting…'}
        </span>
      </div>
      <p className="text-slate-400 text-xs mb-5">
        {lastUpdate ? `updated ${lastUpdate.toLocaleTimeString()}` : ''}
      </p>

      <Card>
        <div className="text-5xl font-extrabold text-blue-700 tabular-nums">{grandTotal}</div>
        <div className="text-sm text-slate-500 mb-4">total people, all stations combined</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile n={grandChecking} label="Check-ins" />
          <StatTile n={grandIndividuals} label="Individuals" />
          <StatTile n={grandFamilies} label="Families" />
          <StatTile n={grandGuests} label="Guests/Investigators" />
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Card>
          <h2 className="font-bold text-sm text-slate-700 mb-3">By station</h2>
          <div className="space-y-2">
            {totals.map((t) => (
              <div key={t.station_id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t.station_name}</span>
                <span className="font-bold tabular-nums">{t.total_people}</span>
              </div>
            ))}
            {totals.length === 0 && <p className="text-slate-400 text-sm">No stations yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-sm text-slate-700 mb-3">By ward</h2>
          <div className="space-y-2">
            {wardTotals.map((w) => (
              <div key={w.ward_name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{w.ward_name}</span>
                <span className="font-bold tabular-nums">{w.total_people}</span>
              </div>
            ))}
            {wardTotals.length === 0 && <p className="text-slate-400 text-sm">No check-ins yet.</p>}
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Updates live over websockets — no need to refresh. Full reports (charts, PDF, guest list) are on{' '}
        <a href={`/reports?event=${event?.id}`} className="text-blue-700 underline">the Reports page</a>.
      </p>
    </PageWrap>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageWrap wide><p className="text-slate-500">Loading…</p></PageWrap>}>
      <DashboardInner />
    </Suspense>
  );
}
