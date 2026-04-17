import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Search from 'lucide-react/dist/esm/icons/search';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import RefreshCcw from 'lucide-react/dist/esm/icons/refresh-ccw';
import Button from '../../../components/ui/Button';

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(50);

    // Modal
    const [selectedTx, setSelectedTx] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchTransactions();
        }, 500);
        return () => clearTimeout(timeout);
    }, [search, statusFilter, page]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const offset = (page - 1) * limit;
            const res = await axios.get(`/api/admin/transactions?search=${search}&status=${statusFilter}&limit=${limit}&offset=${offset}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(res.data.transactions);
            setTotal(res.data.total);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus, refund = false) => {
        if (!confirm(`Are you sure you want to change the status to ${newStatus === 0 ? 'Successful' : 'Failed'}${refund ? ' and refund the user' : ''}?`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/transactions/${selectedTx.id}/status`, {
                newStatus,
                refund,
                reason: 'Admin manual intervention'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Transaction updated successfully')
            setSelectedTx(null);
            fetchTransactions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update transaction')
        } finally {
            setActionLoading(false);
        }
    };

    const handleRetry = async () => {
        if (!confirm('Are you sure you want to retry this failed transaction?')) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/api/admin/transactions/${selectedTx.id}/retry`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.error('Transaction queued for retry')
            setSelectedTx(null);
            fetchTransactions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to retry transaction')
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">System Transactions</h1>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Statuses</option>
                        <option value="0">Successful</option>
                        <option value="1">Pending</option>
                        <option value="2">Failed</option>
                        <option value="3">Refunded</option>
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ref, user, service..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{tx.reference}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium">{tx.user.firstName} {tx.user.lastName}</div>
                                            <div className="text-xs text-gray-500">{tx.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{tx.serviceName}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">₦{tx.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === 0 ? 'bg-green-100 text-green-700' : tx.status === 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {tx.status === 0 ? 'Success' : tx.status === 2 ? 'Failed' : tx.status === 3 ? 'Refunded' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(tx.date).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setSelectedTx(tx)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} transactions
                            </p>
                            <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>Next</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedTx && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-bold">Transaction Details</h2>
                            <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Status</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedTx.status === 0 ? 'bg-green-100 text-green-700' : selectedTx.status === 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {selectedTx.status === 0 ? 'Success' : selectedTx.status === 2 ? 'Failed' : selectedTx.status === 3 ? 'Refunded' : 'Pending'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Reference</p>
                                    <p className="font-mono text-sm">{selectedTx.reference}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">User</p>
                                    <p className="font-medium">{selectedTx.user.firstName} {selectedTx.user.lastName}</p>
                                    <p className="text-sm text-gray-500">{selectedTx.user.email} ({selectedTx.user.phone})</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Service & Amount</p>
                                    <p className="font-medium">{selectedTx.serviceName}</p>
                                    <p className="text-lg font-bold text-gray-900">₦{selectedTx.amount.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Old Bal: ₦{selectedTx.oldBalance?.toLocaleString() || 'N/A'} | New Bal: ₦{selectedTx.newBalance?.toLocaleString() || 'N/A'}</p>
                                    <p className="text-xs text-green-600 mt-1">Profit: ₦{selectedTx.profit.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm font-medium mb-2">Description</p>
                                <p className="text-sm text-gray-600">{selectedTx.description}</p>
                            </div>

                            {selectedTx.apiResponse && (
                                <div className="p-4 bg-slate-900 rounded-xl overflow-hidden">
                                    <p className="text-xs text-gray-400 mb-2 font-medium">API Response Logs</p>
                                    <pre className="text-xs text-green-400 font-mono overflow-auto max-h-40">
                                        {JSON.stringify(typeof selectedTx.apiResponse === 'string' ? JSON.parse(selectedTx.apiResponse) : selectedTx.apiResponse, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-6 border-t border-gray-100">
                                <p className="font-medium text-gray-900 mb-4">Admin Actions</p>
                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={() => handleUpdateStatus(0)} icon={CheckCircle} disabled={actionLoading || selectedTx.status === 0}>
                                        Mark Successful
                                    </Button>
                                    <Button onClick={() => handleUpdateStatus(2, false)} variant="outline" icon={AlertTriangle} disabled={actionLoading || selectedTx.status === 2}>
                                        Mark Failed
                                    </Button>
                                    <Button onClick={() => handleUpdateStatus(3, true)} variant="danger" icon={RefreshCcw} disabled={actionLoading || selectedTx.status === 3 || selectedTx.status === 2}>
                                        Refund User
                                    </Button>
                                    {selectedTx.status === 2 && (
                                        <Button onClick={handleRetry} className="bg-orange-500 hover:bg-orange-600 border-none" icon={RefreshCcw} disabled={actionLoading}>
                                            Retry Transaction
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
