import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Minus, Plus, Send, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CartItem } from '../pages/MenuPage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getApiErrorCode, getApiErrorItems, getApiErrorMessage } from '../utils/apiError';
import { rememberSessionOrder } from '../utils/customerSession';

interface CartBottomSheetProps {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  onClose: () => void;
  totalPrice: number;
  customerInfo: {
    name: string;
    phone: string;
    tenantId: string;
    qrToken: string;
    tableName: string;
    tableId: string;
    tableSessionId: string;
  };
}

export default function CartBottomSheet({
  cart,
  setCart,
  onClose,
  totalPrice,
  customerInfo,
}: CartBottomSheetProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const formatOrderError = (error: unknown) => {
    const code = getApiErrorCode(error);
    const itemNames = getApiErrorItems(error)
      .map((item) => item.menuItemName || item.itemName || item.name)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const itemSuffix = itemNames.length ? `: ${itemNames.join(', ')}` : '';

    if (code === 'INSUFFICIENT_INGREDIENT_STOCK') {
      return `Một số món đã hết nguyên liệu${itemSuffix}. Vui lòng bỏ món đó hoặc gọi nhân viên.`;
    }
    if (code === 'MISSING_MENU_RECIPE' || code === 'MENU_ITEM_NOT_LINKED') {
      return `Một số món chưa sẵn sàng để đặt qua QR${itemSuffix}. Vui lòng chọn món khác hoặc gọi nhân viên.`;
    }

    return getApiErrorMessage(
      error,
      'Không thể gửi đơn hàng. Vui lòng thử lại hoặc gọi nhân viên.',
    );
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQuantity = item.quantity + delta;
        return nextQuantity > 0 ? { ...item, quantity: nextQuantity } : item;
      }),
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    if (cart.length === 1) onClose();
  };

  const updateNote = (id: string, note: string) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setSubmitError('Giỏ hàng đang trống.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);

    const orderData = {
      tableId: customerInfo.tableId,
      sessionId: customerInfo.tableSessionId || undefined,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: cart.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
        note: item.note,
      })),
    };

    try {
      const res = await axios.post(
        `${API_BASE_URL}/orders/${encodeURIComponent(customerInfo.tenantId)}/qr/${encodeURIComponent(customerInfo.qrToken)}`,
        orderData,
      );

      const realOrderId = res.data._id;

      localStorage.setItem('current_order_id', realOrderId);
      rememberSessionOrder(customerInfo.tableSessionId, realOrderId);

      setCart([]);
      setIsSubmitting(false);
      navigate('/home', { state: { submittedOrderId: realOrderId } });
    } catch (error) {
      console.error('Failed to submit order', error);
      setSubmitError(formatOrderError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="cart-overlay"
        onClick={onClose}
        aria-label="Đóng giỏ hàng"
      />
      <aside className="cart-sheet glass-panel" aria-label="Giỏ hàng">
        <div className="sheet-handle" />

        <header className="cart-header">
          <div>
            <span className="section-kicker">{customerInfo.tableName}</span>
            <h2>Giỏ hàng</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Đóng">
            <X size={20} />
          </button>
        </header>

        <div className="cart-items">
          {cart.map((item) => (
            <article key={item.id} className="cart-item">
              <div className="cart-item-main">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.price.toLocaleString('vi-VN')}đ</p>
                </div>

                <div className="quantity-control" aria-label={`Số lượng ${item.name}`}>
                  <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label="Giảm">
                    <Minus size={15} />
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label="Tăng">
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="cart-note-row">
                <input
                  type="text"
                  placeholder="Ghi chú: ít đá, nhiều đường..."
                  value={item.note}
                  onChange={(e) => updateNote(item.id, e.target.value)}
                />
                <button type="button" onClick={() => removeItem(item.id)} aria-label={`Xóa ${item.name}`}>
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="cart-footer">
          {submitError && <div className="form-error">{submitError}</div>}
          <div className="total-row">
            <span>Tổng thanh toán</span>
            <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
          >
            <span>{isSubmitting ? 'Đang gửi đơn...' : 'Gửi đơn xuống bếp'}</span>
            {!isSubmitting && <Send size={18} />}
          </button>
        </footer>
      </aside>
    </>
  );
}
