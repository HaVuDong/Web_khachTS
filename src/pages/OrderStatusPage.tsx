import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChefHat, ChevronLeft, Clock, RefreshCcw, Sparkles, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';

interface PublicOrderStatus {
  status: OrderStatus;
  items?: Array<{
    _id: string;
    name: string;
    quantity: number;
    status: OrderItemStatus;
    note?: string;
  }>;
}

const itemStatusLabels: Record<OrderItemStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PREPARING: 'Đang làm',
  READY: 'Đã xong',
  CANCELLED: 'Đã hủy',
};

export default function OrderStatusPage() {
  const { tenantId, orderId } = useParams();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState<PublicOrderStatus>({ status: 'PENDING', items: [] });

  useEffect(() => {
    if (!tenantId || !orderId) return;

    const fetchStatus = async () => {
      try {
        const res = await axios.get<PublicOrderStatus>(
          `${API_BASE_URL}/orders/${encodeURIComponent(tenantId)}/status/${encodeURIComponent(orderId)}`,
        );
        setOrderStatus({
          status: res.data.status,
          items: Array.isArray(res.data.items) ? res.data.items : [],
        });
      } catch (error) {
        console.error('Failed to fetch status', error);
      }
    };

    void fetchStatus();

    const interval = window.setInterval(fetchStatus, 3000);

    return () => window.clearInterval(interval);
  }, [tenantId, orderId]);

  const content = useMemo(() => {
    const activeItems = (orderStatus.items || []).filter((item) => item.status !== 'CANCELLED');
    const readyCount = activeItems.filter((item) => item.status === 'READY').length;
    const preparingCount = activeItems.filter((item) => item.status === 'PREPARING').length;
    const allItemsReady = activeItems.length > 0 && readyCount === activeItems.length;

    if (orderStatus.status === 'CANCELLED') {
      return {
        icon: <X size={46} />,
        title: 'Đơn đã hủy',
        desc: 'Đơn hàng của bạn đã bị hủy. Vui lòng gọi nhân viên nếu cần hỗ trợ.',
        tone: 'cancelled',
        progressIndex: -1,
      };
    }

    if (orderStatus.status === 'COMPLETED') {
      return {
        icon: <CheckCircle2 size={46} />,
        title: 'Đơn đã hoàn tất',
        desc: 'Đơn đã được quầy xác nhận hoàn tất.',
        tone: 'done',
        progressIndex: 2,
      };
    }

    if (allItemsReady) {
      return {
        icon: <CheckCircle2 size={46} />,
        title: 'Món đã xong',
        desc: 'Tất cả món trong đơn đã sẵn sàng. Nhân viên sẽ mang ra bàn ngay khi có thể.',
        tone: 'done',
        progressIndex: 2,
      };
    }

    if (preparingCount > 0) {
      return {
        icon: <ChefHat size={46} />,
        title: 'Bếp đang chuẩn bị',
        desc: `${readyCount}/${activeItems.length || 0} món đã xong. Trạng thái sẽ tự cập nhật tại đây.`,
        tone: 'progress',
        progressIndex: 1,
      };
    }

    return {
      icon: <Clock size={46} />,
      title: 'Đang chờ xác nhận',
      desc: 'Nhân viên đang kiểm tra đơn của bạn. Thông tin sẽ tự cập nhật tại đây.',
      tone: 'pending',
      progressIndex: 0,
    };
  }, [orderStatus]);

  return (
    <main className="customer-page status-page">
      <header className="status-header">
        <button type="button" onClick={() => navigate('/home')} className="icon-button" aria-label="Quay lại trang bàn">
          <ChevronLeft size={22} />
        </button>
        <span className="order-code glass-panel">
          <Sparkles size={15} />
          #{orderId?.slice(-6).toUpperCase()}
        </span>
      </header>

      <section className={`order-status-card glass-panel status-${content.tone}`}>
        <div className="status-icon-wrap">{content.icon}</div>
        <span className="section-kicker">Trạng thái món</span>
        <h1>{content.title}</h1>
        <p>{content.desc}</p>

        {orderStatus.status !== 'CANCELLED' && (
          <div className="status-steps" aria-label="Tiến độ đơn">
            <span className={content.progressIndex >= 0 ? 'active' : ''} />
            <span className={content.progressIndex >= 1 ? 'active' : ''} />
            <span className={content.progressIndex >= 2 ? 'active done' : ''} />
          </div>
        )}

        {orderStatus.items?.length ? (
          <div className="status-item-list">
            {orderStatus.items.map((item) => (
              <div key={item._id} className="status-item-row">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <strong className={`item-status-pill status-${item.status.toLowerCase()}`}>
                  {itemStatusLabels[item.status]}
                </strong>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className={`status-actions ${content.progressIndex >= 2 || orderStatus.status === 'CANCELLED' ? 'visible' : ''}`}>
        <button type="button" onClick={() => navigate('/menu')} className="secondary-action">
          <RefreshCcw size={18} />
          Gọi thêm món
        </button>
      </div>
    </main>
  );
}
