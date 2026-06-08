import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Coffee, Users, Folder, ShieldAlert, Award, FileText, QrCode, 
  Plus, Download, AlertTriangle, Play 
} from 'lucide-react';
import { API_BASE_URL, buildCustomerTableUrl } from '../config/api';
import { getApiErrorMessage } from '../utils/apiError';

const API_BASE = API_BASE_URL;

type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'KITCHEN' | 'SYSTEM_OWNER';

interface CurrentUser {
  userId?: string;
  tenantId?: string;
  brandName?: string;
  email?: string;
  role?: UserRole | string;
}

interface TableRecord {
  _id: string;
  name: string;
  capacity?: number;
  status?: string;
  qrCodeToken?: string;
}

interface InventoryItemRecord {
  _id: string;
  name: string;
  unit?: string;
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  minStockLevel?: number;
  status?: string;
}

interface StaffMemberRecord {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  salaryConfig?: {
    baseHourly?: number;
    baseShift?: number;
  };
}

interface PayrollUserRecord {
  name?: string;
  role?: string;
}

interface PayrollRecord {
  _id: string;
  userId?: string | PayrollUserRecord;
  totalHours?: number;
  shiftsCount?: number;
  leaveDays?: number;
  unpaidLeaves?: number;
  bonusAmount?: number;
  penaltyAmount?: number;
  finalSalary?: number;
}

interface AuditLogRecord {
  _id: string;
  createdAt: string;
  action?: string;
  details?: unknown;
  ipAddress?: string;
}

interface AdminDashboardProps {
  user: CurrentUser;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tables' | 'inventory' | 'staff' | 'payroll' | 'logs' | 'reports'>('tables');
  const [token] = useState(localStorage.getItem('token') || '');
  const [tenantId] = useState(user.tenantId || '');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Tables tab state
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrTargetUrl, setQrTargetUrl] = useState<string | null>(null);

  // 2. Inventory / Menu state
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('Ly');
  const [itemCategory, setItemCategory] = useState('Trà Sữa');
  const [itemCost, setItemCost] = useState(15000);
  const [itemSelling, setItemSelling] = useState(30000);
  const [itemMinStock, setItemMinStock] = useState(10);
  const [itemStock, setItemStock] = useState(50);
  
  // Stock Import state
  const [importProvider, setImportProvider] = useState('');
  const [importItemId, setImportItemId] = useState('');
  const [importQty, setImportQty] = useState(20);
  const [importPrice, setImportPrice] = useState(12000);

  // 3. Staff states
  const [staffList, setStaffList] = useState<StaffMemberRecord[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('USER');
  const [baseHourly, setBaseHourly] = useState(20000);
  const [baseShift, setBaseShift] = useState(150000);

  // 4. Payroll states
  const [payrollMonth, setPayrollMonth] = useState('2026-05');
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  // 5. Audit logs states
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await axios.get<TableRecord[]>(`${API_BASE}/tables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTables(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch tables'));
    }
  }, [token]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/tables`, {
        name: newTableName,
        capacity: Number(newTableCapacity),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewTableName('');
      setSuccess('Table created successfully');
      await fetchTables();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create table'));
    }
  };

  const handleGenerateQR = (table: TableRecord) => {
    if (!table.qrCodeToken) {
      setError('This table does not have a QR token yet.');
      return;
    }

    const clientUrl = buildCustomerTableUrl(tenantId, table.qrCodeToken);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(clientUrl)}`;
    setQrCodeUrl(qr);
    setQrTargetUrl(clientUrl);
  };

  const fetchItems = useCallback(async () => {
    try {
      const res = await axios.get<InventoryItemRecord[]>(`${API_BASE}/inventory/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch inventory items'));
    }
  }, [token]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/inventory/items`, {
        name: itemName,
        unit: itemUnit,
        category: itemCategory,
        costPrice: Number(itemCost),
        sellingPrice: Number(itemSelling),
        minStockLevel: Number(itemMinStock),
        stock: Number(itemStock),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Inventory item created successfully');
      setItemName('');
      await fetchItems();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create item'));
    }
  };

  const handleImportStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importItemId) return alert('Select an item first');
    try {
      await axios.post(`${API_BASE}/inventory/imports`, {
        provider: importProvider,
        items: [{
          itemId: importItemId,
          quantity: Number(importQty),
          costPrice: Number(importPrice),
        }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Stock imported successfully!');
      await fetchItems();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to import stock'));
    }
  };

  const fetchStaff = useCallback(async () => {
    try {
      const res = await axios.get<StaffMemberRecord[]>(`${API_BASE}/users/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch staff list'));
    }
  }, [token]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/users/staff`, {
        name: staffName,
        email: staffEmail,
        phone: staffPhone,
        password: staffPassword,
        role: staffRole,
        salaryConfig: {
          baseHourly: Number(baseHourly),
          baseShift: Number(baseShift),
          overtimeMultiplier: 1.5,
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Staff account created successfully!');
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      await fetchStaff();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create staff'));
    }
  };

  const handleToggleStaffStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await axios.put(`${API_BASE}/users/staff/${id}`, {
        status: nextStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Staff status updated');
      await fetchStaff();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update staff status'));
    }
  };

  const fetchPayrolls = useCallback(async () => {
    try {
      const res = await axios.get<PayrollRecord[]>(`${API_BASE}/attendance/payroll/history?month=${payrollMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayrolls(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch payroll history'));
    }
  }, [payrollMonth, token]);

  const handleCalculatePayroll = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await axios.post<{ jobId?: string }>(`${API_BASE}/attendance/payroll/calculate`, {
        month: payrollMonth
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(`Payroll calculation queued: Job ID ${res.data.jobId}`);
      setTimeout(() => {
        void fetchPayrolls();
      }, 3000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to queue payroll calculation'));
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get<AuditLogRecord[]>(`${API_BASE}/users/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch audit logs'));
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (activeTab === 'tables') void fetchTables();
      if (activeTab === 'inventory') void fetchItems();
      if (activeTab === 'staff') void fetchStaff();
      if (activeTab === 'payroll') void fetchPayrolls();
      if (activeTab === 'logs') void fetchLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, fetchItems, fetchLogs, fetchPayrolls, fetchStaff, fetchTables]);

  const downloadReport = async (reportType: 'revenue' | 'employee') => {
    try {
      const response = await axios.get(
        `${API_BASE}/reports/${reportType}?export=excel`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Failed to download report');
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-lg">
              TS
            </div>
            <div>
              <h2 className="font-bold text-white text-lg truncate">{user.brandName || 'SaaS Shop'}</h2>
              <p className="text-xs text-purple-400 font-medium">Admin Panel</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'tables' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <Coffee className="w-4 h-4" /> Tables / QR Codes
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'inventory' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <Folder className="w-4 h-4" /> Menu & Stock
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'staff' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Staff Management
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'payroll' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <Award className="w-4 h-4" /> Attendance & Wages
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'logs' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <ShieldAlert className="w-4 h-4" /> Security / Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reports' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
            >
              <FileText className="w-4 h-4" /> Revenue & Exports
            </button>
          </nav>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-800 pt-4">
          <p>Logged in as:</p>
          <p className="font-semibold text-slate-300 truncate">{user.email}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        {error && <div className="bg-red-950/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}
        {success && <div className="bg-green-950/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">{success}</div>}

        {/* 1. TABLES TAB */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Tables List</h2>
              <form onSubmit={handleCreateTable} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Table Name (e.g. Bàn 5)"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  required
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  required
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-20 focus:outline-none focus:border-purple-500"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map((t) => (
                <div key={t._id} className="bg-slate-900 border border-slate-850 p-5 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <p className="text-sm text-slate-400">Capacity: {t.capacity} seats</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${t.status === 'AVAILABLE' ? 'bg-green-950 text-green-300' : 'bg-amber-950 text-amber-300'}`}>
                      {t.status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleGenerateQR(t)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-purple-400 transition-all"
                    title="Generate QR Code"
                  >
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>

            {/* QR Modal preview */}
            {qrCodeUrl && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center">
                  <h2 className="text-lg font-bold text-white mb-4">Table QR Code</h2>
                  <img src={qrCodeUrl} alt="QR Code" className="bg-white p-2 rounded-lg mb-4" />
                  <p className="text-xs text-slate-400 text-center mb-6 max-w-xs break-all">
                    {qrTargetUrl || 'Scan code or share link below to order from this table.'}
                  </p>
                  <button onClick={() => { setQrCodeUrl(null); setQrTargetUrl(null); }} className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold text-sm transition-all">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. INVENTORY & MENU TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Menu Item */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-500" /> Create Menu/Inventory Item
                </h3>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Item Name</label>
                      <input value={itemName} onChange={(e) => setItemName(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Category</label>
                      <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
                        <option value="Trà Sữa">Trà Sữa</option>
                        <option value="Topping">Topping</option>
                        <option value="Sinh Tố">Sinh Tố</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Unit</label>
                      <input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cost Price (đ)</label>
                      <input type="number" value={itemCost} onChange={(e) => setItemCost(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Selling Price (đ)</label>
                      <input type="number" value={itemSelling} onChange={(e) => setItemSelling(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Initial Stock</label>
                      <input type="number" value={itemStock} onChange={(e) => setItemStock(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Min Alert Stock Level</label>
                      <input type="number" value={itemMinStock} onChange={(e) => setItemMinStock(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold text-sm transition-all">
                    Create Item
                  </button>
                </form>
              </div>

              {/* Import Ticket */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-500" /> Create Import Ticket
                </h3>
                <form onSubmit={handleImportStock} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Provider / Nhà cung cấp</label>
                    <input value={importProvider} onChange={(e) => setImportProvider(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" placeholder="e.g. Cty TNHH Nguyên Liệu Trà Sữa" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Select Item to Stock In</label>
                    <select value={importItemId} onChange={(e) => setImportItemId(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
                      <option value="">-- Choose Item --</option>
                      {items.map(i => (
                        <option key={i._id} value={i._id}>{i.name} (Current: {i.stock} {i.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                      <input type="number" value={importQty} onChange={(e) => setImportQty(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Import Cost Price (đ)</label>
                      <input type="number" value={importPrice} onChange={(e) => setImportPrice(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold text-sm transition-all">
                    Submit Import Ticket
                  </button>
                </form>
              </div>
            </div>

            {/* Inventory table */}
            <div className="bg-slate-900 border border-slate-850 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Stock Levels & Menu Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Stock</th>
                      <th className="pb-3">Unit</th>
                      <th className="pb-3">Cost Price</th>
                      <th className="pb-3">Selling Price</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const stock = i.stock ?? 0;
                      const minStockLevel = i.minStockLevel ?? 0;

                      return (
                        <tr key={i._id} className="border-b border-slate-850/50 hover:bg-slate-850/20">
                          <td className="py-3 font-semibold text-white">{i.name}</td>
                          <td className="py-3 text-slate-300">{i.category}</td>
                          <td className="py-3">
                            <span className={`font-semibold ${stock < minStockLevel ? 'text-rose-400 flex items-center gap-1' : 'text-emerald-400'}`}>
                              {stock < minStockLevel && <AlertTriangle className="w-4 h-4" />}
                              {stock}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">{i.unit}</td>
                          <td className="py-3">{(i.costPrice ?? 0).toLocaleString()} đ</td>
                          <td className="py-3 font-semibold text-purple-300">{(i.sellingPrice ?? 0).toLocaleString()} đ</td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs ${i.status === 'ACTIVE' ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}>
                              {i.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Staff Management</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Staff Form */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl space-y-4 h-fit">
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Add New Employee</h3>
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                    <input value={staffName} onChange={(e) => setStaffName(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                    <input value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Hourly Rate (đ)</label>
                      <input type="number" value={baseHourly} onChange={(e) => setBaseHourly(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Shift Rate (đ)</label>
                      <input type="number" value={baseShift} onChange={(e) => setBaseShift(Number(e.target.value))} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">System Role</label>
                    <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white">
                      <option value="USER">USER (Waiter/Staff)</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="KITCHEN">KITCHEN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold text-sm transition-all">
                    Create Employee Account
                  </button>
                </form>
              </div>

              {/* Staff List Table */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-4">Active Staff Members</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Salary Config</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s) => {
                        const staffStatus = s.status || 'LOCKED';

                        return (
                        <tr key={s._id} className="border-b border-slate-850/50 hover:bg-slate-850/20">
                          <td className="py-3">
                            <div className="font-semibold text-white">{s.name}</div>
                            <div className="text-xs text-slate-400">{s.email || s.phone}</div>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-semibold">{s.role}</span>
                          </td>
                          <td className="py-3 text-xs text-slate-300">
                            <div>Hourly: {s.salaryConfig?.baseHourly?.toLocaleString()}đ</div>
                            <div>Shift: {s.salaryConfig?.baseShift?.toLocaleString()}đ</div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${staffStatus === 'ACTIVE' ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}>
                              {staffStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right space-x-2">
                            {staffStatus === 'ACTIVE' ? (
                              <button
                                onClick={() => handleToggleStaffStatus(s._id, staffStatus)}
                                className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 text-xs px-2.5 py-1 rounded transition-all"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStaffStatus(s._id, staffStatus)}
                                className="bg-green-950 hover:bg-green-900 text-green-200 border border-green-800 text-xs px-2.5 py-1 rounded transition-all"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PAYROLL TAB */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Monthly Attendance & Payroll</h2>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
                <button
                  onClick={handleCalculatePayroll}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-4 h-4" /> Run Payroll Calculator (BullMQ)
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Salary Calculations for {payrollMonth}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Base Hours</th>
                      <th className="pb-3">Shift Count</th>
                      <th className="pb-3">Leave Days</th>
                      <th className="pb-3">Bonus / Penalties</th>
                      <th className="pb-3 text-right">Net Wages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((p) => {
                      const payrollUser = typeof p.userId === 'object' ? p.userId : undefined;

                      return (
                        <tr key={p._id} className="border-b border-slate-850/50 hover:bg-slate-850/20">
                          <td className="py-3 font-semibold text-white">
                            {payrollUser?.name || 'Unknown Staff'}
                            <span className="block text-xs font-normal text-slate-400">{payrollUser?.role}</span>
                          </td>
                          <td className="py-3 text-slate-300">{p.totalHours} hrs</td>
                          <td className="py-3 text-slate-300">{p.shiftsCount}</td>
                          <td className="py-3 text-slate-300">{p.leaveDays} (Unpaid: {p.unpaidLeaves})</td>
                          <td className="py-3 text-slate-300">
                            Bonus: {p.bonusAmount?.toLocaleString()}đ / Penalty: {p.penaltyAmount?.toLocaleString()}đ
                          </td>
                          <td className="py-3 text-right font-bold text-purple-300">{p.finalSalary?.toLocaleString()} đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. AUDIT LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Security & Audit Logs</h2>
            <div className="bg-slate-900 border border-slate-850 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Details</th>
                      <th className="pb-3 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l._id} className="border-b border-slate-850/50 hover:bg-slate-850/20 text-xs">
                        <td className="py-3 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="py-3"><span className="px-2 py-0.5 bg-slate-800 rounded font-bold text-purple-400">{l.action}</span></td>
                        <td className="py-3 text-slate-300">{JSON.stringify(l.details)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono">{l.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Revenue & Performance Exports</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl flex flex-col justify-between shadow-lg">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Revenue Export</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Generates a monthly revenue list sheet including billing details, vat, discounts, final calculations.
                  </p>
                </div>
                <button
                  onClick={() => downloadReport('revenue')}
                  className="bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" /> Export Revenue Excel File
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl flex flex-col justify-between shadow-lg">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Staff Performance Export</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Generates total completed customer orders per staff member, sales values and computed shift hours.
                  </p>
                </div>
                <button
                  onClick={() => downloadReport('employee')}
                  className="bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" /> Export Employee Performance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
