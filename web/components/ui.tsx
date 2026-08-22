import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

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
      className={`w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 text-base transition-colors ${className}`}
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
      className={`w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
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
    ['Check-In', '/checkin'],
    ['Display', '/display'],
    ['Reports', '/reports'],
    ['Admin', '/admin'],
  ];
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 mb-5 text-sm">
      {links.map(([label, href]) => (
        <a
          key={href}
          href={typeof window !== 'undefined' ? href + window.location.search : href}
          className={`font-medium ${current === href ? 'text-blue-700' : 'text-slate-500 hover:text-blue-700'}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
