import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Copy from 'lucide-react/dist/esm/icons/copy';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import X from 'lucide-react/dist/esm/icons/x';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Receipt from '../../components/dashboard/Receipt';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Download from 'lucide-react/dist/esm/icons/download';

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all',
        status: 'all',
        search: '',
        startDate: '',
        endDate: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });
    const [selectedTx, setSelectedTx] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, [filters, pagination.page]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const offset = (pagination.page - 1) * pagination.limit;
            const params = new URLSearchParams({
                limit: pagination.limit,
                offset: offset
            });

            if (filters.type !== 'all') params.append('type', filters.type);
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await axios.get(`/api/wallet/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTransactions(res.data.transactions);
            setPagination(prev => ({
                ...prev,
                total: res.data.pagination.total
            }));
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could show a toast here
    };

    const getServiceIcon = (serviceName) => {
        const name = serviceName?.toLowerCase() || '';

        if (name.includes('airtime') && !name.includes('swap')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </div>
            );
        }
        if (name.includes('data')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                </div>
            );
        }
        if (name.includes('cable') || name.includes('tv') || name.includes('dstv') || name.includes('gotv') || name.includes('startimes')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            );
        }
        if (name.includes('electricity') || name.includes('bill')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
            );
        }
        if (name.includes('pin') || name.includes('exam')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
            );
        }
        if (name.includes('swap') || name.includes('cash')) {
            return (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
            );
        }

        // Default
        return (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 0:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} /> Success
                    </span>
                );
            case 1:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle size={12} /> Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle size={12} /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search reference, service..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="pl-10 pr-4 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Type/Service Filter */}
                    <div className="relative w-full md:w-40">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="pl-10 pr-8 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white cursor-pointer"
                        >
                            <option value="all">All Services</option>
                            <option value="airtime">Airtime</option>
                            <option value="data">Data</option>
                            <option value="cable">Cable TV</option>
                            <option value="electricity">Electricity</option>
                            <option value="exam">Exam Pins</option>
                            <option value="data_pin">Data Pins</option>
                            <option value="nin_slip">NIN Slips</option>
                            <option value="bvn_slip">BVN Slips</option>
                            <option value="transfer">Transfers</option>
                            <option value="funding">Funding</option>
                            <option value="manual_service">Manual Service</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative w-full md:w-40">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="pl-10 pr-8 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="0">Success</option>
                            <option value="1">Failed</option>
                            <option value="2">Pending</option>
                        </select>
                    </div>

                    {/* Date Filters */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-40">
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="pl-4 pr-4 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                        </div>
                        <div className="relative flex-1 md:w-40">
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="pl-4 pr-4 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Clear Filters */}
                {(filters.search || filters.status !== 'all' || filters.startDate || filters.endDate) && (
                    <div className="flex justify-end">
                        <button
                            onClick={() => setFilters({ type: 'all', status: 'all', search: '', startDate: '', endDate: '' })}
                            className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <X size={14} /> Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                            <Search size={24} className="opacity-50" />
                        </div>
                        <p>No transactions found matching your criteria.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Service</th>
                                        <th className="px-6 py-4">Reference</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {getServiceIcon(tx.serviceName)}
                                                    <div>
                                                        <span className="block text-sm font-bold text-gray-900">{tx.serviceName}</span>
                                                        <span className="block text-xs text-gray-500 truncate max-w-[150px]">{tx.description}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                                {tx.reference.substring(0, 12)}...
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {tx.amount > 0 ? '-' : '+'}₦{Math.abs(tx.amount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(tx.date).toLocaleDateString()}
                                                <span className="block text-xs opacity-70">
                                                    {new Date(tx.date).toLocaleTimeString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(tx.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedTx(tx)}
                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                >
                                                    <ArrowRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-medium text-gray-700">Page {pagination.page}</span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Helper Modal / Panel */}
            <AnimatePresence>
                {selectedTx && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedTx(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
                                <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="text-center mb-6">
                                    <div className="flex justify-center mb-3">
                                        {/* Simplified large icon for modal */}
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedTx.status === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {selectedTx.status === 0 ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">₦{Math.abs(selectedTx.amount).toLocaleString()}</h2>
                                    <p className="text-gray-500">{selectedTx.serviceName}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-500">Reference</span>
                                        <span className="font-mono font-medium text-gray-900 text-sm break-all">{selectedTx.reference}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-500">Date</span>
                                        <span className="font-medium text-gray-900">{new Date(selectedTx.date).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`font-bold ${selectedTx.status === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedTx.status === 0 ? 'Successful' : 'Failed'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-500">Description</span>
                                        <span className="font-medium text-gray-900 text-right text-sm">{selectedTx.description}</span>
                                    </div>

                                    {/* PIN Display Section */}
                                    {selectedTx.pinContent && (
                                        <div className="mt-4 bg-gray-900 rounded-xl p-4 text-white relative group">
                                            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Purchased PIN</p>
                                            <div className="font-mono text-xl font-bold tracking-widest break-all">
                                                {selectedTx.pinContent}
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(selectedTx.pinContent)}
                                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setSelectedTx(null)}
                                    className="flex-1"
                                >
                                    Close
                                </Button>
                                {selectedTx.status === 0 && (
                                    <Button
                                        onClick={() => setShowReceipt(true)}
                                        className="flex-1 gap-2"
                                    >
                                        <FileText size={18} /> Receipt
                                    </Button>
                                )}
                                {selectedTx.slipUrl && (
                                    <a
                                        href={selectedTx.slipUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1"
                                    >
                                        <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 shadow-green-600/20">
                                            <Download size={18} /> Slip
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showReceipt && selectedTx && (
                    <Receipt
                        transaction={selectedTx}
                        onClose={() => setShowReceipt(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
