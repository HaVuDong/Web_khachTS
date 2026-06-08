import axios from 'axios';

type ApiErrorBody = {
  code?: unknown;
  message?: unknown;
  items?: unknown;
};

function getApiErrorBody(error: unknown): ApiErrorBody | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorBody) : null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = getApiErrorBody(error)?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((item): item is string => typeof item === 'string').join(', ');
    if (joined) return joined;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  const code = getApiErrorBody(error)?.code;
  return typeof code === 'string' ? code : undefined;
}

export function getApiErrorItems(error: unknown): Array<Record<string, unknown>> {
  const items = getApiErrorBody(error)?.items;
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object') : [];
}
