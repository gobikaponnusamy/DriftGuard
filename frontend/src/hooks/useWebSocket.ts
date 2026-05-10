import { useEffect, useState } from 'react';
import type { ReplayProgressEvent } from '../types/api';

export function useWebSocket(sessionId: string) {
  const [events, setEvents] = useState<ReplayProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const base = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080';
    const socket = new WebSocket(`${base}/ws/replay/${sessionId}`);

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onerror = () => setError('WebSocket connection failed');
    socket.onmessage = (message) => {
      try {
        setEvents((current) => [...current, JSON.parse(message.data) as ReplayProgressEvent]);
      } catch {
        setError('Invalid WebSocket event received');
      }
    };

    return () => socket.close();
  }, [sessionId]);

  return { events, isConnected, error };
}
