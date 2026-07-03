import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChefHat,
  Coffee,
  CreditCard,
  ExternalLink,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { API_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiError';
import {
  loadCartItems,
  readCustomerInfo,
  type CustomerInfo,
  type StoredCartItem,
} from '../utils/customerSession';

type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

interface SessionOrderItem {
  _id: string;
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  price: number;
  note?: string;
  status: OrderItemStatus;
  isFree?: boolean;
  subtotal: number;
  orderId?: string;
  orderCode?: string;
}

interface SessionOrder {
  _id: string;
  status: OrderStatus;
  totalAmount: number;
  finalAmount: number;
  createdAt?: string;
  items: SessionOrderItem[];
}

interface TableSessionSummary {
  table: {
    _id: string;
    name: string;
    status?: string;
  };
  session: {
    _id: string;
    status: string;
    openedAt?: string;
    lastActivityAt?: string;
    paymentStatus?: string;
    paidAt?: string;
  };
  customer: {
    name?: string;
    phone?: string;
  };
  orders: SessionOrder[];
  bill: {
    orderCount: number;
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
    finalAmount: number;
    items: SessionOrderItem[];
  };
}

interface PaymentResponse {
  paymentId: string;
  provider: string;
  status: PaymentStatus;
  orderCode: number;
  amount: number;
  description: string;
  checkoutUrl?: string;
  qrCode?: string;
  paidAt?: string;
  createdAt?: string;
}

const itemStatusLabels: Record<OrderItemStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PREPARING: 'Đang làm',
  READY: 'Đã xong',
  SERVED: 'Đã phục vụ',
  CANCELLED: 'Đã hủy',
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

function getOrderCookingLabel(order: SessionOrder) {
  if (order.status === 'CANCELLED') return 'Đã hủy';
  if (order.status === 'COMPLETED') return 'Đã hoàn tất';

  const activeItems = order.items.filter((item) => item.status !== 'CANCELLED');
  const readyCount = activeItems.filter((item) => item.status === 'READY' || item.status === 'SERVED').length;
  const servedCount = activeItems.filter((item) => item.status === 'SERVED').length;
  const preparingCount = activeItems.filter((item) => item.status === 'PREPARING').length;

  if (activeItems.length > 0 && servedCount === activeItems.length) return 'Tất cả món đã phục vụ';
  if (activeItems.length > 0 && readyCount === activeItems.length) return 'Tất cả món đã xong';
  if (preparingCount > 0) return `${readyCount}/${activeItems.length} món đã xong`;
  return orderStatusLabels[order.status];
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function loadDraftCart(customerInfo: CustomerInfo | null): StoredCartItem[] {
  return customerInfo ? loadCartItems(customerInfo.tableSessionId) : [];
}

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customerInfo] = useState<CustomerInfo | null>(() => readCustomerInfo());
  const [summary, setSummary] = useState<TableSessionSummary | null>(null);
  const [draftCart, setDraftCart] = useState<StoredCartItem[]>(() => loadDraftCart(readCustomerInfo()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState<'call' | 'cash' | 'print' | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [showContinuePopup, setShowContinuePopup] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);

  const submittedOrderId = (location.state as { submittedOrderId?: string } | null)?.submittedOrderId;

  const fetchSummary = useCallback(
    async (silent = false) => {
      if (!customerInfo) return;
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError('');
        const res = await axios.get<TableSessionSummary>(
          `${API_BASE_URL}/orders/${encodeURIComponent(customerInfo.tenantId)}/table-session/${encodeURIComponent(
            customerInfo.tableSessionId,
          )}/summary`,
        );
        setSummary(res.data);
        setDraftCart(loadCartItems(customerInfo.tableSessionId));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Không thể tải phiên bàn. Vui lòng quét lại QR hoặc gọi nhân viên.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customerInfo],
  );

  useEffect(() => {
    if (!customerInfo) {
      navigate('/', { replace: true });
      return;
    }

    const initialTimeoutId = window.setTimeout(() => void fetchSummary(), 0);
    const intervalId = window.setInterval(() => void fetchSummary(true), 5000);
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [customerInfo, fetchSummary, navigate]);

  useEffect(() => {
    if (!payment?.paymentId || payment.status !== 'PENDING') return;

    const pollPayment = async () => {
      try {
        const res = await axios.get<PaymentResponse>(
          `${API_BASE_URL}/payments/${encodeURIComponent(payment.paymentId)}/status`,
          {
            params: {
              tenantId: customerInfo?.tenantId,
              sessionId: customerInfo?.tableSessionId,
            },
          },
        );
        setPayment(res.data);
        if (res.data.status === 'PAID') {
          setActionMessage('Thanh toán đã được ghi nhận.');
          void fetchSummary(true);
        }
      } catch (err) {
        console.error('Failed to poll payment status', err);
      }
    };

    const intervalId = window.setInterval(pollPayment, 3000);
    return () => window.clearInterval(intervalId);
  }, [customerInfo?.tableSessionId, customerInfo?.tenantId, fetchSummary, payment?.paymentId, payment?.status]);

  const billItems = summary?.bill.items || [];
  const billTotal = summary?.bill.finalAmount || 0;
  const isSessionPaid = summary?.session.paymentStatus === 'PAID' && billTotal === 0;
  const draftTotal = draftCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasBill = billTotal > 0;

  useEffect(() => {
    if (summary?.session.paymentStatus === 'PAID' && billTotal === 0 && !sessionClosed) {
      setShowContinuePopup(true);
    } else {
      setShowContinuePopup(false);
    }
  }, [summary?.session.paymentStatus, billTotal, sessionClosed]);

  const paymentQrValue = useMemo(() => payment?.qrCode || payment?.checkoutUrl || '', [payment]);

  const sendTableRequest = useCallback(
    async (type: 'CALL_STAFF' | 'PAY_CASH' | 'PRINT_BILL') => {
      if (!customerInfo) return;

      const loadingKey = type === 'CALL_STAFF' ? 'call' : type === 'PAY_CASH' ? 'cash' : 'print';
      setRequestLoading(loadingKey);
      setActionMessage('');
      setPaymentError('');

      try {
        const res = await axios.post(
          `${API_BASE_URL}/orders/${encodeURIComponent(customerInfo.tenantId)}/table-request/${encodeURIComponent(
            customerInfo.qrToken,
          )}`,
          {
            sessionId: customerInfo.tableSessionId,
            type,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            paymentMethod: type === 'PAY_CASH' ? 'CASH' : type === 'PRINT_BILL' ? 'TRANSFER' : undefined,
          },
        );

        if (res.data?.payment) {
          setPayment(res.data.payment);
        }

        if (type === 'CALL_STAFF') setActionMessage('Đã gửi yêu cầu gọi nhân viên.');
        if (type === 'PAY_CASH') setActionMessage('Đã gọi nhân viên thanh toán tiền mặt.');
        if (type === 'PRINT_BILL') setActionMessage('Đã gửi yêu cầu in hóa đơn có QR.');
      } catch (err) {
        setPaymentError(getApiErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
      } finally {
        setRequestLoading(null);
      }
    },
    [customerInfo],
  );

  const createTransferPayment = useCallback(async () => {
    if (!customerInfo) return;

    setPaymentLoading(true);
    setPaymentError('');
    setActionMessage('');

    try {
      const res = await axios.post<PaymentResponse>(`${API_BASE_URL}/payments/payos/create`, {
        tenantId: customerInfo.tenantId,
        sessionId: customerInfo.tableSessionId,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
      });
      setPayment(res.data);
    } catch (err) {
      setPaymentError(getApiErrorMessage(err, 'Không thể tạo mã thanh toán. Vui lòng gọi nhân viên.'));
    } finally {
      setPaymentLoading(false);
    }
  }, [customerInfo, billTotal]);

  const handleCloseSession = useCallback(async () => {
    if (!customerInfo) return;
    try {
      await axios.post(
        `${API_BASE_URL}/orders/${encodeURIComponent(customerInfo.tenantId)}/table-sessions/${encodeURIComponent(
          customerInfo.tableSessionId,
        )}/close`,
      );
      setSessionClosed(true);
      setShowContinuePopup(false);
      localStorage.removeItem('customerSession');
    } catch (err) {
      console.error('Failed to close session', err);
      // Even if API fails, close locally
      setSessionClosed(true);
      setShowContinuePopup(false);
      localStorage.removeItem('customerSession');
    }
  }, [customerInfo]);

  if (!customerInfo) return null;

  if (loading) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel">
          <span className="spinner" />
          <p>Đang tải phiên bàn...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel state-card-error">
          <ReceiptText size={38} />
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="primary-action compact-action">
            Quét lại QR
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-page home-page">
      <header className="home-header glass-panel">
        <div className="home-title-block">
          <span className="brand-pill">
            <Sparkles size={15} />
            TableQ
          </span>
          <h1>{summary?.table.name || customerInfo.tableName}</h1>
          <p>{customerInfo.name}</p>
        </div>
        <button type="button" className="icon-button" onClick={() => void fetchSummary(true)} aria-label="Làm mới">
          <RefreshCcw size={20} className={refreshing ? 'spin-icon' : ''} />
        </button>
      </header>

      <section className="home-overview glass-panel">
        <div>
          <span className="section-kicker">Phiên bàn</span>
          <h2>Xin chào, {customerInfo.name}</h2>
          <p>{customerInfo.phone || 'Khách tại bàn'}</p>
        </div>
        <div className="home-stats-grid">
          <div className="home-stat">
            <span>Đơn mở</span>
            <strong>{summary?.bill.orderCount || 0}</strong>
          </div>
          <div className="home-stat">
            <span>Món</span>
            <strong>{summary?.bill.totalQuantity || 0}</strong>
          </div>
          <div className="home-stat wide">
            <span>{isSessionPaid ? 'Đã thanh toán' : 'Tạm tính'}</span>
            <strong>{isSessionPaid ? '0đ' : formatMoney(billTotal)}</strong>
          </div>
        </div>
      </section>

      {submittedOrderId ? (
        <div className="home-notice glass-panel">
          <CheckCircle2 size={20} />
          <span>Đơn #{submittedOrderId.slice(-6).toUpperCase()} đã gửi xuống quầy.</span>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="home-notice glass-panel">
          <CheckCircle2 size={20} />
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <section className="home-actions-grid" aria-label="Thao tác bàn">
        <button type="button" className="home-action-card glass-panel" onClick={() => navigate('/menu')}>
          <span className="home-action-icon accent-orange">
            <Coffee size={24} />
          </span>
          <strong>Menu</strong>
          <small>Chọn món</small>
          <ArrowRight size={18} />
        </button>

        <button type="button" className="home-action-card glass-panel" onClick={() => setOrdersOpen(true)}>
          <span className="home-action-icon accent-cyan">
            <ShoppingBag size={24} />
          </span>
          <strong>Giỏ hàng</strong>
          <small>{draftCart.length ? `${draftCart.length} món chưa gửi` : 'Đơn đã gọi'}</small>
          <ArrowRight size={18} />
        </button>

        <button
          type="button"
          className="home-action-card glass-panel"
          onClick={() => void sendTableRequest('CALL_STAFF')}
          disabled={requestLoading === 'call'}
        >
          <span className="home-action-icon accent-green">
            <BellRing size={24} />
          </span>
          <strong>Gọi nhân viên</strong>
          <small>{requestLoading === 'call' ? 'Đang gửi' : 'Hỗ trợ tại bàn'}</small>
          <ArrowRight size={18} />
        </button>

        <button type="button" className={`home-action-card glass-panel ${isSessionPaid ? 'disabled-card' : ''}`} onClick={() => !isSessionPaid && setPaymentOpen(true)}>
          <span className="home-action-icon accent-violet">
            <CreditCard size={24} />
          </span>
          <strong>Thanh toán</strong>
          <small>{isSessionPaid ? 'Đã thanh toán' : formatMoney(billTotal)}</small>
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="home-bill-preview glass-panel">
        <div className="home-section-header">
          <div>
            <span className="section-kicker">Đơn đã gọi</span>
            <h2>Trạng thái món</h2>
          </div>
          <button type="button" className="secondary-action compact-inline" onClick={() => setOrdersOpen(true)}>
            Xem
          </button>
        </div>

        {summary?.orders.length ? (
          <div className="home-order-stack">
            {summary.orders.slice(0, 3).map((order) => (
              <article key={order._id} className="session-order-card">
                <div>
                  <strong>#{order._id.slice(-6).toUpperCase()}</strong>
                  <span>{getOrderCookingLabel(order)}</span>
                </div>
                <button
                  type="button"
                  className="text-link-button"
                  onClick={() => navigate(`/status/${customerInfo.tenantId}/${order._id}`)}
                >
                  Theo dõi
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-home-block">
            <ChefHat size={32} />
            <p>Chưa có đơn nào trong phiên bàn.</p>
          </div>
        )}
      </section>

      {ordersOpen ? (
        <>
          <button type="button" className="cart-overlay" onClick={() => setOrdersOpen(false)} aria-label="Đóng đơn đã gọi" />
          <aside className="cart-sheet glass-panel home-sheet" aria-label="Đơn đã gọi">
            <div className="sheet-handle" />
            <header className="cart-header">
              <div>
                <span className="section-kicker">{summary?.table.name || customerInfo.tableName}</span>
                <h2>Giỏ hàng / Đơn đã gọi</h2>
              </div>
              <button type="button" onClick={() => setOrdersOpen(false)} className="icon-button" aria-label="Đóng">
                <X size={20} />
              </button>
            </header>

            <div className="home-sheet-body">
              {draftCart.length ? (
                <section className="sheet-section">
                  <div className="home-section-header compact">
                    <h3>Chưa gửi</h3>
                    <strong>{formatMoney(draftTotal)}</strong>
                  </div>
                  {draftCart.map((item) => (
                    <div key={item.id} className="bill-line">
                      <span>{item.quantity}x {item.name}</span>
                      <strong>{formatMoney(item.price * item.quantity)}</strong>
                    </div>
                  ))}
                  <button type="button" className="primary-action" onClick={() => navigate('/menu')}>
                    <span>Tiếp tục đặt món</span>
                    <ArrowRight size={18} />
                  </button>
                </section>
              ) : null}

              {summary?.orders.length ? (
                <section className="sheet-section">
                  <div className="home-section-header compact">
                    <h3>Đang mở</h3>
                    <strong>{isSessionPaid ? 'Đã thanh toán' : formatMoney(billTotal)}</strong>
                  </div>
                  {summary.orders.map((order) => (
                    <article key={order._id} className="order-detail-card">
                      <div className="order-detail-heading">
                        <strong>#{order._id.slice(-6).toUpperCase()}</strong>
                        <span>{getOrderCookingLabel(order)}</span>
                      </div>
                      {order.items.map((item) => (
                        <div key={item._id} className="order-item-status-row">
                          <div>
                            <span>{item.quantity}x {item.name}</span>
                            {item.note ? <small>{item.note}</small> : null}
                          </div>
                          <strong className={`item-status-pill status-${item.status.toLowerCase()}`}>
                            {itemStatusLabels[item.status]}
                          </strong>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => navigate(`/status/${customerInfo.tenantId}/${order._id}`)}
                      >
                        Theo dõi đơn
                      </button>
                    </article>
                  ))}
                </section>
              ) : null}

              {!draftCart.length && !summary?.orders.length ? (
                <div className="empty-home-block">
                  <ShoppingBag size={34} />
                  <p>Chưa có món nào.</p>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}

      {paymentOpen ? (
        <>
          <button type="button" className="cart-overlay" onClick={() => setPaymentOpen(false)} aria-label="Đóng thanh toán" />
          <aside className="cart-sheet glass-panel home-sheet payment-sheet" aria-label="Thanh toán">
            <div className="sheet-handle" />
            <header className="cart-header">
              <div>
                <span className="section-kicker">{summary?.table.name || customerInfo.tableName}</span>
                <h2>Thanh toán</h2>
              </div>
              <button type="button" onClick={() => setPaymentOpen(false)} className="icon-button" aria-label="Đóng">
                <X size={20} />
              </button>
            </header>

            <div className="home-sheet-body">
              <section className="sheet-section bill-box">
                <div className="home-section-header compact">
                  <h3>Hóa đơn</h3>
                  <strong>{isSessionPaid ? 'Đã thanh toán' : formatMoney(billTotal)}</strong>
                </div>
                {billItems.length ? (
                  billItems.map((item) => (
                    <div key={`${item.orderId}-${item._id}`} className="bill-line">
                      <span>{item.quantity}x {item.name}</span>
                      <strong className={isSessionPaid ? 'strikethrough-text' : ''}>{formatMoney(item.subtotal)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="sheet-muted">Chưa có món để thanh toán.</p>
                )}
              </section>

              {paymentError ? <div className="form-error">{paymentError}</div> : null}

              <div className="payment-action-grid">
                <button
                  type="button"
                  className="payment-option-button"
                  onClick={() => void sendTableRequest('PAY_CASH')}
                  disabled={!hasBill || requestLoading === 'cash'}
                >
                  <Wallet size={21} />
                  <span>{requestLoading === 'cash' ? 'Đang gửi...' : 'Tiền mặt'}</span>
                </button>
                <button
                  type="button"
                  className="payment-option-button"
                  onClick={() => void createTransferPayment()}
                  disabled={!hasBill || paymentLoading}
                >
                  <QrCode size={21} />
                  <span>{paymentLoading ? 'Đang tạo...' : 'Chuyển khoản'}</span>
                </button>
                <button
                  type="button"
                  className="payment-option-button wide"
                  onClick={() => void sendTableRequest('PRINT_BILL')}
                  disabled={!hasBill || requestLoading === 'print'}
                >
                  <Printer size={21} />
                  <span>{requestLoading === 'print' ? 'Đang gửi...' : 'Yêu cầu in hóa đơn có QR'}</span>
                </button>
              </div>

              {payment ? (
                <section className={`payment-result-box status-${payment.status.toLowerCase()}`}>
                  <div className="home-section-header compact">
                    <h3>{payment.status === 'PAID' ? 'Đã thanh toán' : 'Mã chuyển khoản'}</h3>
                    <strong>{formatMoney(payment.amount)}</strong>
                  </div>
                  {payment.status === 'PAID' ? (
                    <div className="payment-paid-mark">
                      <CheckCircle2 size={36} />
                      <span>Thanh toán thành công</span>
                    </div>
                  ) : (
                    <>
                      {paymentQrValue ? (
                        <QRCodeCanvas
                          className="payment-qr"
                          value={paymentQrValue}
                          size={260}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#111827"
                          marginSize={2}
                          title="QR thanh toán"
                        />
                      ) : null}
                      {payment.checkoutUrl ? (
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => window.open(payment.checkoutUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <span>Mở trang thanh toán</span>
                          <ExternalLink size={18} />
                        </button>
                      ) : null}
                      <p className="sheet-muted">Trạng thái: {payment.status}</p>
                    </>
                  )}
                </section>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}

      {showContinuePopup ? (
        <div className="sheet-overlay">
          <div className="home-sheet modal-sheet">
            <div className="home-sheet-header">
              <h3>Thanh toán thành công</h3>
              <button type="button" className="icon-button" onClick={() => setShowContinuePopup(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="home-sheet-body" style={{ textAlign: 'center', paddingTop: 20 }}>
              <CheckCircle2 size={48} color="#4ade80" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: '1.1rem', marginBottom: 24, lineHeight: 1.5 }}>
                Bạn đã thanh toán thành công. Bạn có muốn gọi thêm món không?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ flex: 1 }}
                  onClick={() => void handleCloseSession()}
                >
                  Không (Đóng phiên)
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  style={{ flex: 1 }}
                  onClick={() => setShowContinuePopup(false)}
                >
                  Có (Dùng tiếp)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
