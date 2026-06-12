import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Coffee, MapPin, Phone, Sparkles, UserRound } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface TableInfoResponse {
  _id: string;
  name: string;
  status?: string;
  sessionId?: string;
  sessionStatus?: string;
}

export default function WelcomePage() {
  const { tenantId, qrToken } = useParams<{ tenantId: string; qrToken: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const routeError = !tenantId || !qrToken ? 'Mã QR không hợp lệ.' : '';

  useEffect(() => {
    if (!tenantId || !qrToken) {
      return;
    }

    axios
      .get<TableInfoResponse>(
        `${API_BASE_URL}/orders/${encodeURIComponent(tenantId)}/table-info/${encodeURIComponent(qrToken)}`,
      )
      .then((res) => {
        setTableName(res.data.name);
        setLoading(false);
        localStorage.setItem('tenantId', tenantId);
        localStorage.setItem('qrToken', qrToken);
        localStorage.setItem('tableId', res.data._id);
        localStorage.setItem('tableName', res.data.name);
        if (res.data.sessionId) {
          localStorage.setItem('tableSessionId', res.data.sessionId);
        } else {
          localStorage.removeItem('tableSessionId');
        }
      })
      .catch(() => {
        setError('Mã QR không hợp lệ hoặc bàn không tồn tại.');
        setLoading(false);
      });
  }, [tenantId, qrToken]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    localStorage.setItem('customerName', name.trim());
    localStorage.setItem('customerPhone', phone.trim());

    navigate('/home');
  };

  if (routeError || error) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel state-card-error">
          <Coffee size={34} />
          <p>{routeError || error}</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel">
          <span className="spinner" />
          <p>Đang tải thông tin bàn...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-page welcome-layout">
      <section className="welcome-hero glass-panel">
        <span className="brand-pill">
          <Sparkles size={15} />
          TableQ
        </span>
        <div className="welcome-copy">
          <h1>Gọi món tại bàn, nhanh và rõ ràng.</h1>
          <p>
            Chọn món, gửi thẳng xuống quầy và theo dõi trạng thái đơn ngay trên trình duyệt.
          </p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="drink-cup">
            <span />
            <span />
            <span />
          </div>
          <div className="receipt-strip">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="table-badge-row">
          <span className="table-badge">
            <MapPin size={15} />
            {tableName}
          </span>
          <span className="status-chip">
            <span className="status-dot status-dot-green" />
            Sẵn sàng gọi món
          </span>
        </div>
      </section>

      <section className="welcome-card glass-panel">
        <div className="section-kicker">Thông tin khách</div>
        <h2>Bắt đầu đơn của bạn</h2>
        <form onSubmit={handleSubmit} className="customer-form">
          <div className="floating-field">
            <UserRound size={18} />
            <input
              id="name"
              type="text"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
            <label htmlFor="name">Tên của bạn</label>
          </div>

          <div className="floating-field">
            <Phone size={18} />
            <input
              id="phone"
              type="tel"
              placeholder=" "
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
            <label htmlFor="phone">Số điện thoại</label>
          </div>

          <button type="submit" className="primary-action">
            <span>Bắt đầu chọn món</span>
            <ArrowRight size={19} />
          </button>
        </form>
      </section>
    </main>
  );
}
