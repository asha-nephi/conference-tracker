'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParam } from '@/lib/hooks';
import { getEvent, listStations } from '@/lib/data';
import type { EventRow, StationRow } from '@/lib/types';
import { renderQrToCanvas } from '@/lib/qr';

function QrInner() {
  const eventParam = useParam('event');
  const stationParam = useParam('station');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [station, setStation] = useState<StationRow | null>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    (async () => {
      if (!eventParam) return;
      const ev = await getEvent(eventParam);
      if (!ev) return;
      setEvent(ev);
      const stations = await listStations(ev.id);
      const st = stations.find((s) => s.id === stationParam) ?? stations[0] ?? null;
      setStation(st);
      const target = `${window.location.origin}/checkin?event=${ev.id}${st ? `&station=${st.id}` : ''}`;
      setUrl(target);
    })();
  }, [eventParam, stationParam]);

  useEffect(() => {
    if (canvasRef.current && url) renderQrToCanvas(canvasRef.current, url, 420);
  }, [url]);

  if (!eventParam) {
    return <div className="min-h-screen flex items-center justify-center p-8 text-center text-slate-500">Add ?event=EVENT_ID to the URL.</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mb-4 text-sm">
        <a href={station ? `/admin` : '/admin'} className="text-blue-700 underline">Back to admin</a>
      </div>
      <h1 className="text-2xl font-bold mb-1">Scan to Check In</h1>
      <p className="text-slate-500 mb-6">{event?.title}{station ? ` · ${station.name}` : ''}</p>
      <canvas ref={canvasRef} className="border border-slate-200 rounded-xl max-w-full h-auto" />
      <p className="text-xs text-slate-400 mt-6 break-all max-w-md">{url}</p>
      <p className="text-slate-600 mt-6 max-w-sm">
        Open your phone&apos;s camera app, point it at this code, and tap the link that appears.
      </p>
      <button onClick={() => window.print()} className="no-print mt-6 rounded-xl border-2 border-blue-600 text-blue-700 font-semibold py-2.5 px-6 text-sm">
        Print
      </button>
    </div>
  );
}

export default function QrPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <QrInner />
    </Suspense>
  );
}
