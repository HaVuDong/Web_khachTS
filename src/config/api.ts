const fallbackApiBaseUrl = 'http://localhost:3000';
const fallbackCustomerAppBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl);
export const CUSTOMER_APP_BASE_URL = trimTrailingSlash(import.meta.env.VITE_CUSTOMER_APP_BASE_URL || fallbackCustomerAppBaseUrl);

export function buildCustomerTableUrl(tenantId: string, qrToken: string) {
  return `${CUSTOMER_APP_BASE_URL}/table/${encodeURIComponent(tenantId)}/${encodeURIComponent(qrToken)}`;
}
