import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Save from 'lucide-react/dist/esm/icons/save';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ApiWalletMonitor() {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ balance: '', lowBalanceAlert: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/api-wallets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWallets(res.data.wallets);
        } catch (error) {
            console.error('Failed to fetch wallets', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckBalances = async () => {
        setChecking(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.get('/api/admin/api-wallets/check-balances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchWallets(); // Refresh data
            alert('Balances checked (Note: Auto-check requires provider API integration)');
        } catch (error) {
            alert('Failed to check balances');
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
        } catch (error) {
            alert('Failed to update wallet');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API Wallets</h1>
                    <p className="text-gray-500">Monitor and manage balances for external API providers</p>
                </div>
                <Button
                    onClick={handleCheckBalances}
                    loading={checking}
                    variant="outline"
                    icon={RefreshCw}
                >
                    Refresh Balances
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wallets.map(wallet => {
                    const isLow = wallet.balance <= wallet.lowBalanceAlert;
                    const isEditing = editingId === wallet.id;

                    return (
                        <div key={wallet.id} className={`bg-white rounded-xl shadow-sm border ${isLow ? 'border-red-300' : 'border-gray-100'} overflow-hidden transition-all hover:shadow-md`}>
                            <div className={`px-6 py-4 flex justify-between items-center ${isLow ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <h3 className="font-bold text-gray-800">{wallet.apiProvider?.name || 'Unknown Provider'}</h3>
                                {isLow && <AlertTriangle className="text-red-500 w-5 h-5 pointer-events-none" />}
                            </div>

                            <div className="p-6 space-y-4">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <Input
                                            label="Current Balance (₦)"
                                            type="number"
                                            value={editForm.balance}
                                            onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                                        />
                                        <Input
                                            label="Low Balance Alert (₦)"
                                            type="number"
                                            value={editForm.lowBalanceAlert}
                                            onChange={(e) => setEditForm({ ...editForm, lowBalanceAlert: e.target.value })}
                                        />
                                        <div className="flex space-x-2 pt-2">
                                            <Button size="sm" onClick={() => handleUpdate(wallet.id)} loading={saving} icon={Save}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Balance</p>
                                            <p className={`text-3xl font-bold font-mono ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                                                ₦{wallet.balance.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end pt-2">
                                            <div>
                                                <p className="text-xs text-gray-400">Low Alert: ₦{wallet.lowBalanceAlert.toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">Last Checked: {new Date(wallet.lastChecked).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={() => startEdit(wallet)}
                                                className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
