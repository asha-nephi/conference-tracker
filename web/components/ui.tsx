'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { listEvents } from '@/lib/data';
import type { EventRow } from '@/lib/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 text-base shadow-sm shadow-blue-600/20 transition-colors ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold py-2.5 px-4 text-sm transition-colors ${className}`}
      {...props}
    />
  );
}

export function ToggleButton({
  active,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      className={`flex-1 rounded-xl border-2 py-3 px-3 font-semibold text-sm transition-colors ${
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      } ${className}`}
      {...props}
    />
  );
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      // min-w-0 matters here: inside a flex row, a plain w-full input still
      // defaults to min-width:auto and shrinks to near-nothing next to a
      // sibling button — this is what caused the squished input bug.
      className={`w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700 mt-3.5 mb-1.5">{children}</label>;
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export function StatTile({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3.5 text-center">
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{n}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

export function PageWrap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-md'} px-4 py-6 pb-16`}>{children}</div>
  );
}

export function TopNav({ current }: { current: string }) {
  const links = [
    ['Dashboard', '/dashboard'],
    ['Station', '/station'],
    ['Display', '/display'],
    ['Reports', '/reports'],
    ['Admin', '/admin'],
  ];
  return (
    <nav className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1.5 overflow-x-auto">
      {links.map(([label, href]) => (
        <a
          key={href}
          href={typeof window !== 'undefined' ? href + window.location.search : href}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            current === href ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

// Consistent "no event in the URL" state for every page — picks up whatever
// events exist, or points to Admin if there are none yet. `linkTo` builds
// the destination URL for a given event, e.g. (id) => `/station?event=${id}`.
export function EventPicker({ linkTo, dark = false }: { linkTo: (id: string) => string; dark?: boolean }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
  const link = dark ? 'text-blue-400 underline' : 'text-blue-700 underline';

  return (
    <Card className={dark ? 'bg-slate-900 border-slate-700' : ''}>
      {events === null ? (
        <p className={`text-sm ${textMuted}`}>Loading…</p>
      ) : events.length === 0 ? (
        <p className={`text-sm ${textMuted}`}>
          No sessions yet. <a href="/admin" className={link}>Create one in Admin</a>.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <a key={ev.id} href={linkTo(ev.id)} className={`block text-sm ${link}`}>
              {ev.title} <span className={textMuted}>({ev.event_date})</span>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
