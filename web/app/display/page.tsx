'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParam } from '@/lib/hooks';
import { getEvent, getEventTotals, subscribeToCheckinEvents } from '@/lib/data';
import type { EventRow } from '@/lib/types';
import { EventPicker } from '@/components/ui';

function DisplayInner() {
  const eventParam = useParam('event');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [shown, setShown] = useState(0);
  const [breakdown, setBreakdown] = useState('');
  const [connected, setConnected] = useState(false);
  const animTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function animateTo(target: number) {
    if (animTimer.current) clearInterval(animTimer.current);
    setShown((current) => {
      const start = current;
      const diff = target - start;
      if (diff === 0) return current;
      const duration = 700;
      const startTime = Date.now();
      animTimer.current = setInterval(() => {
        const p = Math.min(1, (Date.now() - startTime) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(start + diff * eased));
        if (p >= 1 && animTimer.current) {
          clearInterval(animTimer.current);
          animTimer.current = null;
          setShown(target);
        }
      }, 40);
      return current;
    });
  }

  async function refresh(eventId: string) {
    const totals = await getEventTotals(eventId);
    const total = totals.reduce((s, t) => s + Number(t.total_people), 0);
    setBreakdown(totals.map((t) => `${t.station_name}: ${t.total_people}`).join('   ·   '));
    animateTo(total);
  }

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

    // A useEffect callback must return its cleanup synchronously — wrapping
    // the async work in an IIFE and `return`-ing from inside it (the
    // previous version) discards that return value, so React never got a
    // cleanup function. Under Strict Mode's mount→cleanup→mount dev cycle
    // that leaked a duplicate Realtime subscription on every navigation.
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventParam]);

  if (!eventParam) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <EventPicker dark linkTo={(id) => `/display?event=${id}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden">
      <div className="text-xl sm:text-2xl text-slate-400 font-semibold uppercase tracking-widest mb-2">
        {event?.title ?? 'Loading…'}
      </div>
      <div className="font-extrabold tabular-nums leading-none text-[16vw] sm:text-[20vw] text-white">
        {shown.toLocaleString()}
      </div>
      <div className="text-slate-500 text-lg sm:text-2xl mt-6">{breakdown}</div>
      <div className={`fixed bottom-5 right-6 text-sm ${connected ? 'text-slate-600' : 'text-amber-500'}`}>
        {connected ? 'live' : 'connecting…'}
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <DisplayInner />
    </Suspense>
  );
}
