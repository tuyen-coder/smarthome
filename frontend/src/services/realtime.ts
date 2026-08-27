// app/services/realtime.ts (hoặc file hiện tại của bạn)
import { env } from '@/src/config/env';

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

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.socket = new WebSocket(env.WS_URL);

    this.socket.onopen = () => {
      console.log('[WS] Connected successfully');
      this.socket?.send('mobile-connected');
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
      console.log('[WS] Disconnected');
      this.socket = null;
      // Tự động thử kết nối lại sau 3 giây nếu không phải do app chủ động ngắt
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WS Error]', error);
      this.socket?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[WS] Reconnecting...');
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
    // Hàm unsubcribe trả về khi dọn dẹp effect
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtime = new RealtimeService();