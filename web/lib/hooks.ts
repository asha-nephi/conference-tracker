'use client';
import { useSearchParams } from 'next/navigation';

export function useParam(name: string): string | null {
  const sp = useSearchParams();
  return sp.get(name);
}
