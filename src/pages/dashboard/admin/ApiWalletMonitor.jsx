import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import MinusCircle from 'lucide-react/dist/esm/icons/minus-circle';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import Save from 'lucide-react/dist/esm/icons/save';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '../../../components/ui/Button';

const STATUS_CONFIG = {
    updated: { label: 'Live',    icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
    failed:  { label: 'Failed',  icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
    error:   { label: 'Error',   icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
    skipped: { label: 'Skipped', icon: MinusCircle,  color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

export default function ApiWalletMonitor() {
    const [wallets, setWallets]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [checking, setChecking]     = useState(false);
    const [editingId, setEditingId]   = useState(null);
    const [editForm, setEditForm]     = useState({ balance: '', lowBalanceAlert: '' });
    const [saving, setSaving]         = useState(false);
    const [checkResults, setCheckResults] = useState(null);  // { summary, results }
    const [toast, setToast]           = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => { fetchWallets(); }, []);

    const fetchWallets = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/api-wallets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWallets(res.data.wallets || []);
        } catch (error) {
            console.error('Failed to fetch wallets', error);
            showToast('Failed to load API wallets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckBalances = async () => {
        setChecking(true);
        setCheckResults(null);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/api-wallets/check-balances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCheckResults(res.data);
            showToast(`✅ ${res.data.summary.updated} updated, ${res.data.summary.failed} failed, ${res.data.summary.skipped} skipped`);
            fetchWallets(); // Refresh the cards
        } catch (error) {
            showToast('Failed to check balances. Check server logs.', 'error');
        } finally {
            setChecking(false);
        }
    };

    const startEdit = (wallet) => {
        setEditingId(wallet.id);
        setEditForm({
            balance: wallet.balance.toString(),
            lowBalanceAlert: wallet.lowBalanceAlert.toString()
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ balance: '', lowBalanceAlert: '' });
    };

    const handleUpdate = async (id) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put(`/api/admin/api-wallets/${id}/update-balance`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWallets(wallets.map(w => w.id === id ? res.data.wallet : w));
            setEditingId(null);
            showToast('Wallet updated successfully!');
        } catch (error) {
            showToast('Failed to update wallet', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const lowBalanceCount = wallets.filter(w => w.balance <= w.lowBalanceAlert).length;

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium
                    ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="text-indigo-600" /> API Wallet Monitor
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Live balance tracking for all provider APIs
                    </p>
                </div>
                <Button
                    onClick={handleCheckBalances}
                    loading={checking}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <RefreshCw size={16} className={`mr-2 ${checking ? 'animate-spin' : ''}`} />
                    {checking ? 'Checking...' : 'Refresh All Balances'}
                </Button>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Total Providers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{wallets.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Combined Balance</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">₦{totalBalance.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm ${lowBalanceCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                    <p className="text-xs text-gray-500 font-medium">Low Balance Alerts</p>
                    <p className={`text-2xl font-bold mt-1 ${lowBalanceCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {lowBalanceCount}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Last Refresh</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                        {wallets[0]?.lastChecked ? new Date(wallets[0].lastChecked).toLocaleTimeString() : 'Never'}
                    </p>
                </div>
            </div>

            {/* Check Results Panel */}
            {checkResults && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Last Refresh Results</h2>
                        <div className="flex gap-4 text-xs">
                            <span className="text-green-600 font-bold">✅ {checkResults.summary.updated} updated</span>
                            <span className="text-red-600 font-bold">❌ {checkResults.summary.failed} failed</span>
                            <span className="text-gray-500 font-bold">— {checkResults.summary.skipped} skipped</span>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {checkResults.results.map((r, i) => {
                            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.skipped;
                            const Icon = cfg.icon;
                            return (
                                <div key={i} className="flex items-center justify-between px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <Icon size={16} className={cfg.color} />
                                        <span className="text-sm font-medium text-gray-800">{r.provider}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-gray-900">₦{(r.balance || 0).toLocaleString()}</span>
                                        {r.message && <p className="text-xs text-gray-400">{r.message}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Wallet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {wallets.map(wallet => {
                    const isLow     = wallet.balance <= wallet.lowBalanceAlert;
                    const isEditing = editingId === wallet.id;
                    const pct       = wallet.lowBalanceAlert > 0
                        ? Math.min(100, (wallet.balance / (wallet.lowBalanceAlert * 5)) * 100)
                        : 100;

                    return (
                        <div
                            key={wallet.id}
                            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md
                                ${isLow ? 'border-red-300' : 'border-gray-100'}`}
                        >
                            {/* Card Header */}
                            <div className={`px-5 py-4 flex justify-between items-center ${isLow ? 'bg-red-50' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">
                                        {wallet.apiProvider?.name || 'Unknown Provider'}
                                    </h3>
                                    <span className={`text-xs font-medium ${wallet.apiProvider?.active ? 'text-green-600' : 'text-gray-400'}`}>
                                        {wallet.apiProvider?.active ? '● Active' : '● Inactive'}
                                    </span>
                                </div>
                                {isLow && (
                                    <div className="flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">
                                        <AlertTriangle size={12} /> Low Balance
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-4">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Balance (₦)</label>
                                            <input
                                                type="number"
                                                value={editForm.balance}
                                                onChange={e => setEditForm({ ...editForm, balance: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Low Balance Alert (₦)</label>
                                            <input
                                                type="number"
                                                value={editForm.lowBalanceAlert}
                                                onChange={e => setEditForm({ ...editForm, lowBalanceAlert: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="1000"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => handleUpdate(wallet.id)}
                                                disabled={saving}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-all disabled:opacity-60"
                                            >
                                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition-all"
                                            >
                                                <X size={12} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Balance Display */}
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                                            <p className={`text-3xl font-bold font-mono tracking-tight
                                                ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                ₦{(wallet.balance || 0).toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Balance Health Bar */}
                                        <div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                    style={{ width: `${Math.max(2, pct)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <div>
                                                <p>Alert below: <span className="font-semibold text-gray-600">₦{wallet.lowBalanceAlert.toLocaleString()}</span></p>
                                                <p>Checked: {new Date(wallet.lastChecked).toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => startEdit(wallet)}
                                                className="flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                                            >
                                                <Edit3 size={13} /> Edit
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {wallets.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Wallet size={48} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No API wallet records found</p>
                    <p className="text-sm mt-1">Add providers in Provider Management to see their wallets here.</p>
                </div>
            )}
        </div>
    );
}
