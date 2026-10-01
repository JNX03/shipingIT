import { useEffect, useRef, useState } from 'react';
import { opportunityProvider } from '@/services/opportunities';
import {
  connectWebMCP,
  type PageModelContext,
  type WebMCPOptions,
  type WebMCPStatus,
} from '@/services/webmcp-tools';
export type { WebMCPSnapshot, WebMCPDestination } from '@/services/webmcp-tools';
type Options = Pick<WebMCPOptions, 'getSnapshot' | 'onNavigate'> & { enabled?: boolean };
export function useWebMCP({ getSnapshot, onNavigate, enabled = true }: Options) {
  const latest = useRef({ getSnapshot, onNavigate });
  const [status, setStatus] = useState<WebMCPStatus>('unsupported');
  useEffect(() => {
    latest.current = { getSnapshot, onNavigate };
  }, [getSnapshot, onNavigate]);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
    let active = true;
    const connection = connectWebMCP(context, {
      getSnapshot: () => latest.current.getSnapshot(),
      onNavigate: (destination, field) => latest.current.onNavigate(destination, field),
      listOpportunities: opportunityProvider.list,
    });
    void connection.ready.then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
      connection.disconnect();
    };
  }, [enabled]);
  return enabled ? status : 'disabled';
}
