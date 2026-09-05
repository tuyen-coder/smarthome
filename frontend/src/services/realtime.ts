import { env } from '@/src/config/env';
import { getAccessToken } from '@/src/services/api';

type RealtimePayload = {
  type: string;
  [key: string]: unknown;
};

type Listener = (payload: RealtimePayload) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private currentHomeId: number | null = null;

  connect(homeId?: number) {
    if (homeId !== undefined) {
      this.currentHomeId = homeId;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (homeId && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'switch_home', home_id: homeId }));
      }
      return;
    }

    this.isExplicitlyClosed = false;
    const token = getAccessToken();
    const params: string[] = [];
    if (token) params.push(`token=${encodeURIComponent(token)}`);
    if (this.currentHomeId) params.push(`home_id=${encodeURIComponent(String(this.currentHomeId))}`);

    const wsUrl = `${env.WS_URL}${params.length > 0 ? '?' + params.join('&') : ''}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      // console.log('[WS] Connected to realtime gateway');
      const curToken = getAccessToken();
      if (curToken) {
        this.socket?.send(
          JSON.stringify({
            type: 'authenticate',
            token: curToken,
            home_id: this.currentHomeId,
          })
        );
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimePayload;
        this.listeners.forEach((listener) => listener(payload));
      } catch {
        // Ignore malformed messages
      }
    };

    this.socket.onclose = () => {
      // console.log('[WS] Disconnected');
      this.socket = null;
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WS Error]', error);
      this.socket?.close();
    };
  }

  setHome(homeId: number) {
    this.currentHomeId = homeId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'switch_home', home_id: homeId }));
    } else {
      this.connect(homeId);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      // console.log('[WS] Reconnecting...');
      this.connect();
    }, 3000);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtime = new RealtimeService();