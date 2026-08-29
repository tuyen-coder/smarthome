import { env } from '@/src/config/env';

type RealtimePayload = {
  type: string;
  [key: string]: unknown;
};

type Listener = (payload: RealtimePayload) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(env.WS_URL);
    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimePayload;
        this.listeners.forEach((listener) => listener(payload));
      } catch {
        // Ignore malformed external messages and keep the socket alive.
      }
    };
    this.socket.onopen = () => this.socket?.send('mobile-connected');
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const realtime = new RealtimeService();
