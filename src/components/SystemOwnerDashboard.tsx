import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Plus, Calendar, Palette, Lock, Unlock, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { getApiErrorMessage } from '../utils/apiError';

const API_BASE = API_BASE_URL;

interface TenantRecord {
  _id: string;
  brandName?: string;
  domain?: string;
  status?: string;
  subscription?: {
    package?: string;
    expiresAt?: string;
  };
  settings?: {
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
  };
}

export default function SystemOwnerDashboard() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [token] = useState(localStorage.getItem('token') || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState<TenantRecord | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<TenantRecord | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [brandName, setBrandName] = useState('');
  const [domain, setDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [packageName, setPackageName] = useState('STANDARD');
  const [durationMonths, setDurationMonths] = useState(12);

  // Branding states
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#aa3bff');

  // Renew states
  const [renewMonths, setRenewMonths] = useState(12);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await axios.get<TenantRecord[]>(`${API_BASE}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenants(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch tenants'));
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const timeoutId = window.setTimeout(() => {
      void fetchTenants();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTenants, token]);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post(
        `${API_BASE}/tenants`,
        {
          brandName,
          domain,
          adminName,
          adminEmail,
          adminPassword,
          packageName,
          durationMonths: Number(durationMonths),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Tenant onboarded successfully!');
      setShowAddModal(false);
      await fetchTenants();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to onboard tenant'));
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBrandingModal) return;
    setError('');
    setSuccess('');
    try {
      await axios.patch(
        `${API_BASE}/tenants/${showBrandingModal._id}`,
        {
          settings: {
            logoUrl,
            bannerUrl,
            primaryColor,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Branding updated successfully!');
      setShowBrandingModal(null);
      await fetchTenants();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update branding'));
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenewModal) return;
    setError('');
    setSuccess('');
    try {
      await axios.patch(
        `${API_BASE}/tenants/${showRenewModal._id}`,
        {
          subscription: {
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + renewMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Subscription extended successfully!');
      setShowRenewModal(null);
      await fetchTenants();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to renew subscription'));
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setError('');
    setSuccess('');
    try {
      await axios.patch(
        `${API_BASE}/tenants/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Tenant status updated to ${status}`);
      await fetchTenants();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleResetPassword = async (id: string) => {
    setError('');
    setSuccess('');
    const newPass = prompt('Enter new temporary password:');
    if (!newPass) return;
    try {
      await axios.post(
        `${API_BASE}/tenants/${id}/reset-admin-password`,
        { newPassword: newPass },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Admin password reset successfully');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to reset password'));
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-purple-400">
          <Shield className="w-8 h-8" />
          System Owner Dashboard
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" /> Onboard Tenant
        </button>
      </div>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">{success}</div>}

      {/* Tenant grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((t) => (
          <div key={t._id} className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{t.brandName}</h3>
                  <p className="text-slate-400 text-sm">{t.domain}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.status === 'ACTIVE' ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                  {t.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-300 mb-6">
                <div className="flex justify-between">
                  <span>Package:</span>
                  <span className="font-semibold text-purple-300">{t.subscription?.package}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span>{t.subscription?.expiresAt ? new Date(t.subscription.expiresAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  setShowBrandingModal(t);
                  setLogoUrl(t.settings?.logoUrl || '');
                  setBannerUrl(t.settings?.bannerUrl || '');
                  setPrimaryColor(t.settings?.primaryColor || '#aa3bff');
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Palette className="w-4 h-4" /> Branding
              </button>
              <button
                onClick={() => {
                  setShowRenewModal(t);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Calendar className="w-4 h-4" /> Renew
              </button>
              <button
                onClick={() => handleResetPassword(t._id)}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Reset Admin
              </button>
              {t.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleUpdateStatus(t._id, 'LOCKED')}
                  className="bg-red-950/40 hover:bg-red-950/60 border border-red-900 text-red-300 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Lock className="w-4 h-4" /> Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus(t._id, 'ACTIVE')}
                  className="bg-green-950/40 hover:bg-green-950/60 border border-green-900 text-green-300 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Unlock className="w-4 h-4" /> Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddTenant} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Onboard New Tenant</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Brand Name</label>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Domain</label>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" placeholder="e.g. trasuavip.com" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Admin Name</label>
              <input value={adminName} onChange={(e) => setAdminName(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Admin Email</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Admin Password</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Package</label>
                <select value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500">
                  <option value="STANDARD">STANDARD</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (Months)</label>
                <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="bg-slate-700 hover:bg-slate-650 px-4 py-2 rounded-lg font-semibold text-sm">Cancel</button>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm">Onboard</button>
            </div>
          </form>
        </div>
      )}

      {/* Branding Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateBranding} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Custom Branding - {showBrandingModal.brandName}</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Logo URL</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Banner Background URL</label>
              <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Primary Brand Color</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 h-10 outline-none focus:border-purple-500" />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={() => setShowBrandingModal(null)} className="bg-slate-700 hover:bg-slate-650 px-4 py-2 rounded-lg font-semibold text-sm">Cancel</button>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm">Save settings</button>
            </div>
          </form>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRenew} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Extend Subscription</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Extend (Months)</label>
              <input type="number" value={renewMonths} onChange={(e) => setRenewMonths(Number(e.target.value))} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-purple-500" />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={() => setShowRenewModal(null)} className="bg-slate-700 hover:bg-slate-650 px-4 py-2 rounded-lg font-semibold text-sm">Cancel</button>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm">Renew</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
