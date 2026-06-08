import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChefHat, ChevronLeft, Clock, RefreshCcw, Sparkles, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export default function OrderStatusPage() {
  const { tenantId, orderId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus>('PENDING');

  useEffect(() => {
    if (!tenantId || !orderId) return;

    const fetchStatus = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/orders/${encodeURIComponent(tenantId)}/status/${encodeURIComponent(orderId)}`,
        );
        setStatus(res.data.status);
      } catch (error) {
        console.error('Failed to fetch status', error);
      }
    };

    void fetchStatus();

    const interval = window.setInterval(fetchStatus, 3000);

    return () => window.clearInterval(interval);
  }, [tenantId, orderId]);

  const content = useMemo(() => {
    switch (status) {
      case 'PENDING':
        return {
          icon: <Clock size={46} />,
          title: 'Đang chờ xác nhận',
          desc: 'Nhân viên đang kiểm tra đơn của bạn. Thông tin sẽ tự cập nhật tại đây.',
          tone: 'pending',
          progressIndex: 0,
        };
      case 'IN_PROGRESS':
        return {
          icon: <ChefHat size={46} />,
          title: 'Bếp đang chuẩn bị',
          desc: 'Món ngon đang được làm. Bạn cứ theo dõi trạng thái đơn trên màn hình này.',
          tone: 'progress',
          progressIndex: 1,
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 size={46} />,
          title: 'Đơn đã sẵn sàng',
          desc: 'Món đã xong. Nhân viên sẽ mang ra bàn ngay khi có thể.',
          tone: 'done',
          progressIndex: 2,
        };
      case 'CANCELLED':
        return {
          icon: <X size={46} />,
          title: 'Đơn đã hủy',
          desc: 'Đơn hàng của bạn đã bị hủy. Vui lòng gọi nhân viên nếu cần hỗ trợ.',
          tone: 'cancelled',
          progressIndex: -1,
        };
      default:
        return {
          icon: <Clock size={46} />,
          title: 'Đang tải...',
          desc: '',
          tone: 'pending',
          progressIndex: 0,
        };
    }
  }, [status]);

  return (
    <main className="customer-page status-page">
      <header className="status-header">
        <button type="button" onClick={() => navigate('/menu')} className="icon-button" aria-label="Quay lại menu">
          <ChevronLeft size={22} />
        </button>
        <span className="order-code glass-panel">
          <Sparkles size={15} />
          #{orderId?.slice(-6).toUpperCase()}
        </span>
      </header>

      <section className={`order-status-card glass-panel status-${content.tone}`}>
        <div className="status-icon-wrap">{content.icon}</div>
        <span className="section-kicker">Trạng thái đơn</span>
        <h1>{content.title}</h1>
        <p>{content.desc}</p>

        {status !== 'CANCELLED' && (
          <div className="status-steps" aria-label="Tiến độ đơn">
            <span className={content.progressIndex >= 0 ? 'active' : ''} />
            <span className={content.progressIndex >= 1 ? 'active' : ''} />
            <span className={content.progressIndex >= 2 ? 'active done' : ''} />
          </div>
        )}
      </section>

      <div className={`status-actions ${status === 'COMPLETED' || status === 'CANCELLED' ? 'visible' : ''}`}>
        <button type="button" onClick={() => navigate('/menu')} className="secondary-action">
          <RefreshCcw size={18} />
          Gọi thêm món
        </button>
      </div>
    </main>
  );
}
