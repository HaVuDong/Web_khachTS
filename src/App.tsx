import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import WelcomePage from './pages/WelcomePage';
import MenuPage from './pages/MenuPage';
import OrderStatusPage from './pages/OrderStatusPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/table/:tenantId/:qrToken" element={<WelcomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/status/:tenantId/:orderId" element={<OrderStatusPage />} />
          <Route
            path="/"
            element={
              <main className="empty-qr-page">
                <div className="empty-qr-card glass-panel">
                  <span className="brand-pill">
                    <QrCode size={16} />
                    Table QR
                  </span>
                  <h1>TraSua Order</h1>
                  <p>Quet ma QR tai ban de bat dau goi mon.</p>
                </div>
              </main>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
