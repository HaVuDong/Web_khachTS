export interface CustomerInfo {
  name: string;
  tableName: string;
  tenantId: string;
  qrToken: string;
  phone: string;
  tableId: string;
  tableSessionId: string;
}

export interface StoredCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
}

function readString(key: string) {
  return localStorage.getItem(key) || '';
}

export function readCustomerInfo(): CustomerInfo | null {
  const name = readString('customerName');
  const phone = readString('customerPhone');
  const tableName = readString('tableName');
  const tenantId = readString('tenantId');
  const qrToken = readString('qrToken');
  const tableId = readString('tableId');
  const tableSessionId = readString('tableSessionId');

  if (!name || !tableName || !tenantId || !qrToken || !tableSessionId) return null;
  return { name, tableName, tenantId, qrToken, phone, tableId, tableSessionId };
}

export function getCartStorageKey(tableSessionId: string) {
  return `customer_cart_${tableSessionId || 'unknown'}`;
}

export function loadCartItems(tableSessionId: string): StoredCartItem[] {
  try {
    const raw = localStorage.getItem(getCartStorageKey(tableSessionId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.name || ''),
        price: Number(item?.price || 0),
        quantity: Number(item?.quantity || 0),
        note: String(item?.note || ''),
      }))
      .filter((item) => item.id && item.name && item.quantity > 0);
  } catch {
    return [];
  }
}

export function saveCartItems(tableSessionId: string, cart: StoredCartItem[]) {
  const key = getCartStorageKey(tableSessionId);
  if (cart.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(cart));
}

export function getSessionOrderIds(tableSessionId: string): string[] {
  try {
    const raw = localStorage.getItem(`customer_orders_${tableSessionId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

export function rememberSessionOrder(tableSessionId: string, orderId: string) {
  const current = getSessionOrderIds(tableSessionId);
  const next = [orderId, ...current.filter((id) => id !== orderId)].slice(0, 20);
  localStorage.setItem(`customer_orders_${tableSessionId}`, JSON.stringify(next));
}
