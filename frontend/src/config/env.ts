const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

export const env = {
  API_URL,
  WS_URL:
    process.env.EXPO_PUBLIC_WS_URL ??
    API_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws'),
} as const;
