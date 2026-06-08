import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ChefHat, Check, Flame } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiError';

const API_BASE = API_BASE_URL;

interface CurrentUser {
  userId?: string;
  tenantId?: string;
  brandName?: string;
}

interface KitchenOrderItem {
  _id: string;
  itemId?: string | { name?: string };
  quantity?: number;
  note?: string;
  status?: string;
}

interface KitchenOrder {
  _id: string;
  tableId?: string | { name?: string };
  customer?: {
    name?: string;
    phone?: string;
  };
  items: KitchenOrderItem[];
  createdAt?: string;
}

interface KitchenDashboardProps {
  user: CurrentUser;
}

export default function KitchenDashboard({ user }: KitchenDashboardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [token] = useState(localStorage.getItem('token') || '');
  const [tenantId] = useState(user.tenantId || '');
  const [userId] = useState(user.userId || '');
  const [error, setError] = useState('');

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await axios.get<KitchenOrder[]>(`${API_BASE}/orders/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch active kitchen orders'));
    }
  }, [token]);

  const playAlert = useCallback(() => {
    try {
      type AudioContextConstructor = typeof AudioContext;
      const AudioCtor = window.AudioContext
        || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
      if (!AudioCtor) return;

      const audioCtx = new AudioCtor();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => oscillator.stop(), 300);
    } catch {
      console.log('Audio Context blocked or not supported');
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchActiveOrders();
    }, 0);

    // Setup Socket.IO Client for Kitchen
    const socket = io(API_BASE, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Kitchen socket connected');
      // Join tenant room
      socket.emit('register', { tenantId, userId });
    });

    socket.on('newQrOrder', () => {
      playAlert();
      void fetchActiveOrders();
    });

    socket.on('orderConfirmed', () => {
      playAlert();
      void fetchActiveOrders();
    });

    socket.on('itemStatusChanged', () => {
      void fetchActiveOrders();
    });

    return () => {
      window.clearTimeout(timeoutId);
      socket.disconnect();
    };
  }, [fetchActiveOrders, playAlert, tenantId, userId]);

  const updateStatus = async (orderId: string, itemId: string, nextStatus: string) => {
    try {
      await axios.patch(
        `${API_BASE}/orders/${orderId}/items/${itemId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      void fetchActiveOrders();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Failed to update item status'));
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-emerald-400">
          <ChefHat className="w-8 h-8" />
          Kitchen Tablet View
        </h1>
        <div className="bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-800 text-xs">
          Tenant: <span className="font-semibold text-emerald-300">{user.brandName}</span>
        </div>
      </div>

      {error && <div className="bg-red-950/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-900 rounded-2xl">
          <ChefHat className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No active kitchen orders</p>
          <p className="text-sm">Orders will appear here as customers or staff place them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((o, idx) => {
            const table = typeof o.tableId === 'object' ? o.tableId : undefined;

            return (
              <div key={o._id} className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4 border-b border-slate-850 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{table?.name || 'Table'}</h3>
                      <p className="text-xs text-slate-400">
                        Customer: {o.customer?.name || 'Staff'} {o.customer?.phone ? `(${o.customer.phone})` : ''}
                      </p>
                    </div>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {o.items.map((item) => {
                      const menuItem = typeof item.itemId === 'object' ? item.itemId : undefined;

                      return (
                        <div key={item._id} className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          <div>
                            <div className="font-bold text-slate-200">{menuItem?.name || 'Item'}</div>
                            <div className="text-xs text-slate-400">Qty: {item.quantity} {item.note ? `| Note: ${item.note}` : ''}</div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {item.status === 'PENDING' && (
                              <button
                                onClick={() => updateStatus(o._id, item._id, 'PREPARING')}
                                className="bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
                              >
                                <Flame className="w-3.5 h-3.5" /> Start
                              </button>
                            )}
                            {item.status === 'PREPARING' && (
                              <button
                                onClick={() => updateStatus(o._id, item._id, 'READY')}
                                className="bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" /> Ready
                              </button>
                            )}
                            {item.status === 'READY' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800">
                                READY
                              </span>
                            )}
                            {item.status === 'CANCELLED' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-red-950 text-red-400 font-semibold border border-red-800">
                                CANCELLED
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-850 text-xs text-slate-500 text-right">
                  Time: {o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : '--'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
