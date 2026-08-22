'use client';

import { useEffect, useState } from 'react';
import { listEvents } from '@/lib/data';
import type { EventRow } from '@/lib/types';
import { Card, PageWrap, SecondaryButton } from '@/components/ui';

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  return (
    <PageWrap>
      <h1 className="text-2xl font-bold mb-1">Conference Tracker</h1>
      <p className="text-slate-500 text-sm mb-6">Pick an event to open its station, dashboard, display, or report.</p>

      <div className="space-y-3 mb-6">
        {events.map((ev) => (
          <Card key={ev.id}>
            <div className="font-semibold">{ev.title}</div>
            <div className="text-xs text-slate-400 mb-3">{ev.event_date}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <a className="text-blue-700 underline" href={`/checkin?event=${ev.id}`}>Self check-in</a>
              <a className="text-blue-700 underline" href={`/station?event=${ev.id}`}>Usher station</a>
              <a className="text-blue-700 underline" href={`/dashboard?event=${ev.id}`}>Dashboard</a>
              <a className="text-blue-700 underline" href={`/display?event=${ev.id}`}>Big-screen display</a>
              <a className="text-blue-700 underline" href={`/reports?event=${ev.id}`}>Reports</a>
              <a className="text-blue-700 underline" href={`/admin`}>Configure</a>
            </div>
          </Card>
        ))}
        {events.length === 0 && (
          <Card>
            <p className="text-slate-500 text-sm">No events yet.</p>
          </Card>
        )}
      </div>

      <a href="/admin">
        <SecondaryButton>Create / manage events</SecondaryButton>
      </a>
    </PageWrap>
  );
}
