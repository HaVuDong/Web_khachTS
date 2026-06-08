import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Plus, Search, ShoppingBag, Sparkles } from 'lucide-react';
import CartBottomSheet from '../components/CartBottomSheet';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiError';

const ALL_CATEGORY = 'Tất cả';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
}

interface CustomerInfo {
  name: string;
  tableName: string;
  tenantId: string;
  qrToken: string;
  phone: string;
  tableId: string;
  tableSessionId: string;
}

interface PublicMenuItem {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  sellingPrice: number;
  imageUrl?: string;
  available?: boolean;
}

function readCustomerInfo(): CustomerInfo | null {
  const name = localStorage.getItem('customerName');
  const phone = localStorage.getItem('customerPhone');
  const tableName = localStorage.getItem('tableName');
  const tenantId = localStorage.getItem('tenantId');
  const qrToken = localStorage.getItem('qrToken');
  const tableId = localStorage.getItem('tableId');
  const tableSessionId = localStorage.getItem('tableSessionId');

  if (!name || !tableName || !tenantId || !qrToken) return null;
  return {
    name,
    tableName,
    tenantId,
    qrToken,
    phone: phone || '',
    tableId: tableId || '',
    tableSessionId: tableSessionId || '',
  };
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerInfo] = useState<CustomerInfo | null>(() => readCustomerInfo());
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([ALL_CATEGORY]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState('');

  const fetchMenu = useCallback(async (tenantId: string) => {
    try {
      setMenuError('');
      const res = await axios.get<PublicMenuItem[]>(
        `${API_BASE_URL}/orders/${encodeURIComponent(tenantId)}/menu`,
      );
      const items = res.data;
      setMenuItems(items);

      const nextCategories = Array.from(
        new Set(
          items
            .map((item) => item.category)
            .filter((category): category is string => Boolean(category)),
        ),
      );
      setCategories([ALL_CATEGORY, ...nextCategories]);
    } catch (err) {
      console.error('Failed to load menu', err);
      setMenuError(
        getApiErrorMessage(
          err,
          'Không thể tải thực đơn. Vui lòng quét lại mã QR hoặc gọi nhân viên.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customerInfo) {
      navigate('/', { replace: true });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchMenu(customerInfo.tenantId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [customerInfo, fetchMenu, navigate]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return menuItems.filter((item) => {
      const categoryMatched = activeCategory === ALL_CATEGORY || item.category === activeCategory;
      const searchMatched =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.description?.toLowerCase().includes(normalizedSearch);

      return categoryMatched && searchMatched;
    });
  }, [activeCategory, menuItems, searchTerm]);

  const addToCart = (item: PublicMenuItem) => {
    if (item.available === false) return;

    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item._id);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }
      return [...prev, { id: item._id, name: item.name, price: item.sellingPrice, quantity: 1, note: '' }];
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!customerInfo) return null;

  if (loading) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel">
          <span className="spinner" />
          <p>Đang tải thực đơn...</p>
        </div>
      </main>
    );
  }

  if (menuError) {
    return (
      <main className="customer-page center-state">
        <div className="state-card glass-panel state-card-error">
          <ShoppingBag size={38} />
          <p>{menuError}</p>
          <button onClick={() => navigate('/')} className="primary-action compact-action">
            Quét lại QR
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-page menu-page">
      <header className="menu-header glass-panel">
        <div className="menu-greeting">
          <span className="section-kicker">Khách hàng</span>
          <h1>
            Chào {customerInfo.name}, <em>{customerInfo.tableName}</em>
          </h1>
        </div>
        <div className="header-actions">
          <span className="status-chip">
            <span className="status-dot status-dot-green" />
            Đang mở bàn
          </span>
          <span className="header-spark">
            <Sparkles size={18} />
          </span>
        </div>
      </header>

      <section className="menu-toolbar glass-panel">
        <label className="menu-search">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm món, trà sữa, topping..."
          />
        </label>

        <div className="category-row scrollbar-hide" aria-label="Danh mục món">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`category-pill ${activeCategory === category ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="menu-content">
        <div className="menu-section-heading">
          <div>
            <span className="section-kicker">Thực đơn</span>
            <h2>{activeCategory}</h2>
          </div>
          <p>{filteredItems.length} món</p>
        </div>

        {filteredItems.length > 0 ? (
          <div className="menu-grid">
            {filteredItems.map((item) => (
              <article key={item._id} className={`menu-card glass-panel ${item.available === false ? 'is-disabled' : ''}`}>
                <div className="menu-image-frame">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="menu-fallback-visual">
                      <Coffee size={34} />
                    </div>
                  )}
                  {item.available === false && <span className="sold-out-badge">Hết món</span>}
                </div>
                <div className="menu-card-body">
                  <span className="menu-category">{item.category || 'Món mới'}</span>
                  <h3>{item.name}</h3>
                  {item.description && <p>{item.description}</p>}
                  <div className="menu-card-footer">
                    <strong>{item.sellingPrice.toLocaleString('vi-VN')}đ</strong>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={item.available === false}
                      className="add-button"
                      aria-label={`Thêm ${item.name}`}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-menu glass-panel">
            <ShoppingBag size={34} />
            <p>Chưa có món phù hợp.</p>
          </div>
        )}
      </section>

      {totalItems > 0 && (
        <div className="floating-cart">
          <button type="button" onClick={() => setIsCartOpen(true)} className="floating-cart-button">
            <span className="cart-count">{totalItems}</span>
            <span>Xem giỏ hàng</span>
            <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
          </button>
        </div>
      )}

      {isCartOpen && (
        <CartBottomSheet
          cart={cart}
          setCart={setCart}
          onClose={() => setIsCartOpen(false)}
          totalPrice={totalPrice}
          customerInfo={customerInfo}
        />
      )}
    </main>
  );
}
