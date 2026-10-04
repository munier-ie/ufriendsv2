import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Search, 
    Loader2, 
    Eye, 
    X, 
    AlertTriangle, 
    CheckCircle, 
    RefreshCcw, 
    ShieldAlert, 
    ShieldCheck, 
    ArrowUpRight, 
    DollarSign, 
    User, 
    Calendar, 
    Filter, 
    Copy, 
    Check, 
    Lock, 
    Unlock, 
    TrendingUp, 
    Info 
} from 'lucide-react';
import { modal } from '../../../contexts/ModalContext';
import Button from '../../../components/ui/Button';

export default function WalletCreditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [stats, setStats] = useState({ todayTotalAmount: 0, todayCreditCount: 0, heldUsersCount: 0 });

    // Modals
    const [selectedLog, setSelectedLog] = useState(null);
    const [holdModalUser, setHoldModalUser] = useState(null);
    const [holdReason, setHoldReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [copiedRef, setCopiedRef] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                ...(search ? { search } : {}),
                ...(typeFilter ? { type: typeFilter } : {}),
                ...(minAmount ? { minAmount } : {}),
                ...(startDate ? { startDate } : {}),
                ...(endDate ? { endDate } : {})
            });

            const res = await axios.get(`/api/admin/wallet-credits?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setLogs(res.data.logs || []);
                setPagination(res.data.pagination || { total: 0, pages: 1 });
                setStats(res.data.stats || { todayTotalAmount: 0, todayCreditCount: 0, heldUsersCount: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch wallet credits', error);
            modal.error(error.response?.data?.error || 'Failed to load wallet credit logs');
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, typeFilter, minAmount, startDate, endDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 350);
        return () => clearTimeout(timer);
    }, [fetchLogs]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    const handleToggleSecurityHold = async (user, shouldHold) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post(`/api/admin/users/${user.id}/security-hold`, {
                hold: shouldHold,
                reason: holdReason || (shouldHold ? 'Admin flagged suspicious wallet activity' : 'Admin cleared security hold')
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                modal.success(res.data.message);
                setHoldModalUser(null);
                setHoldReason('');
                fetchLogs();
                if (selectedLog && selectedLog.user?.id === user.id) {
                    setSelectedLog(prev => ({
                        ...prev,
                        user: { ...prev.user, securityHold: shouldHold }
                    }));
                }
            }
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to update security hold status');
        } finally {
            setActionLoading(false);
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'admin_fund':
            case 'ADMIN_FUND':
                return {
                    label: 'Admin Manual Fund',
                    bg: 'bg-red-100 text-red-700 border-red-200',
                    dot: 'bg-red-500'
                };
            case 'MONNIFY_WEBHOOK':
            case 'monnify':
                return {
                    label: 'Monnify VA',
                    bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    dot: 'bg-emerald-500'
                };
            case 'PAYMENTPOINT_WEBHOOK':
            case 'paymentpoint':
                return {
                    label: 'PaymentPoint VA',
                    bg: 'bg-blue-100 text-blue-700 border-blue-200',
                    dot: 'bg-blue-500'
                };
            case 'p2p_transfer':
            case 'P2P_TRANSFER':
                return {
                    label: 'P2P Received',
                    bg: 'bg-purple-100 text-purple-700 border-purple-200',
                    dot: 'bg-purple-500'
                };
            case 'airtime_to_cash':
            case 'AIRTIME_TO_CASH':
                return {
                    label: 'Airtime to Cash',
                    bg: 'bg-amber-100 text-amber-800 border-amber-200',
                    dot: 'bg-amber-500'
                };
            case 'referral_withdrawal':
            case 'REFERRAL_WITHDRAWAL':
                return {
                    label: 'Referral Bonus',
                    bg: 'bg-teal-100 text-teal-800 border-teal-200',
                    dot: 'bg-teal-500'
                };
            case 'REFUND':
            case 'VENDING_REFUND':
            case 'BVN_VERIFICATION_REFUND':
            case 'NIN_VERIFICATION_REFUND':
            case 'MANUAL_SERVICE_REJECTION':
                return {
                    label: 'System Refund',
                    bg: 'bg-orange-100 text-orange-800 border-orange-200',
                    dot: 'bg-orange-500'
                };
            default:
                return {
                    label: type || 'Credit',
                    bg: 'bg-gray-100 text-gray-700 border-gray-200',
                    dot: 'bg-gray-400'
                };
        }
    };

    const resetFilters = () => {
        setSearch('');
        setTypeFilter('');
        setMinAmount('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowUpRight className="text-emerald-600" size={26} />
                        User Wallet Credit Logs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Comprehensive audit trail of all user wallet balance additions (webhooks, transfers, refunds, admin funding) with automated fraud surveillance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchLogs}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Stat Cards with Watermarked Background Icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Credited Today */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                    {/* Background Watermark Icon */}
                    <div className="absolute -right-4 -bottom-4 text-emerald-600 opacity-[0.06] group-hover:opacity-[0.14] group-hover:scale-110 transition-all duration-500 pointer-events-none -rotate-6">
                        <TrendingUp size={120} strokeWidth={0.85} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Credited Today</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight my-2">
                            ₦{Number(stats.todayTotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium flex items-center mt-auto pt-1">
                            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-emerald-400"></span>
                            Sum of all incoming funds today
                        </p>
                    </div>
                </div>

                {/* Card 2: Events Today */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                    {/* Background Watermark Icon */}
                    <div className="absolute -right-4 -bottom-4 text-blue-600 opacity-[0.06] group-hover:opacity-[0.14] group-hover:scale-110 transition-all duration-500 pointer-events-none -rotate-6">
                        <DollarSign size={120} strokeWidth={0.85} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Credit Events Today</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight my-2">
                            {stats.todayCreditCount.toLocaleString()}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium flex items-center mt-auto pt-1">
                            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-blue-400"></span>
                            Total credit additions logged today
                        </p>
                    </div>
                </div>

                {/* Card 3: Filtered Records */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                    {/* Background Watermark Icon */}
                    <div className="absolute -right-4 -bottom-4 text-purple-600 opacity-[0.06] group-hover:opacity-[0.14] group-hover:scale-110 transition-all duration-500 pointer-events-none -rotate-6">
                        <Filter size={120} strokeWidth={0.85} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Filtered Records</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight my-2">
                            {pagination.total.toLocaleString()}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium flex items-center mt-auto pt-1">
                            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-purple-400"></span>
                            Matching current search criteria
                        </p>
                    </div>
                </div>

                {/* Card 4: Accounts on Hold */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                    {/* Background Watermark Icon */}
                    <div className="absolute -right-4 -bottom-4 text-rose-600 opacity-[0.06] group-hover:opacity-[0.14] group-hover:scale-110 transition-all duration-500 pointer-events-none -rotate-6">
                        <ShieldAlert size={120} strokeWidth={0.85} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Accounts on Hold</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight leading-tight my-2">
                            {stats.heldUsersCount.toLocaleString()}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium flex items-center mt-auto pt-1">
                            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-rose-400"></span>
                            Suspended pending admin review
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search user, phone, email, reference, reason..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-gray-900 placeholder-gray-400 bg-white"
                        />
                    </div>

                    {/* Source / Type Filter */}
                    <div>
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm text-gray-700 bg-white"
                        >
                            <option value="">All Funding Sources</option>
                            <option value="MONNIFY">Monnify Virtual Account</option>
                            <option value="PAYMENTPOINT">PaymentPoint Virtual Account</option>
                            <option value="admin_fund">Admin Manual Fund</option>
                            <option value="p2p_transfer">P2P Transfer</option>
                            <option value="airtime_to_cash">Airtime to Cash</option>
                            <option value="referral_withdrawal">Referral Bonus</option>
                            <option value="REFUND">System Refunds (Vending/Services)</option>
                        </select>
                    </div>

                    {/* Min Amount */}
                    <div>
                        <input
                            type="number"
                            placeholder="Min Amount (₦)"
                            value={minAmount}
                            onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-gray-900 placeholder-gray-400 bg-white"
                        />
                    </div>

                    {/* Date range & Reset */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="w-full px-2 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs text-gray-700 bg-white"
                            title="Start Date"
                        />
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition whitespace-nowrap bg-white"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Amount Credited</th>
                                    <th className="px-6 py-4">Balance Shift</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center text-gray-500">
                                            <Info className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm font-medium">No wallet credit records match your filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const badge = getTypeBadge(log.type);
                                        const isHeld = log.user?.securityHold;
                                        const isHaltAmount = log.amount >= 10000;
                                        const isWarningAmount = log.amount >= 5000 && !isHaltAmount;
                                        const isAdminCredit = log.type === 'admin_fund' || log.type === 'ADMIN_FUND';

                                        return (
                                            <tr 
                                                key={log.id} 
                                                className={`hover:bg-gray-50 transition-colors ${isAdminCredit ? 'bg-red-50/40' : ''}`}
                                            >
                                                {/* User */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                                            {log.user?.firstName?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-900 text-sm">
                                                                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : `User #${log.userId}`}
                                                                </span>
                                                                {isHeld && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                                        SECURITY HOLD
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{log.user?.phone}</div>
                                                            <div className="text-[11px] text-gray-400">{log.user?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Amount */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="font-bold text-base text-emerald-600">
                                                            +₦{Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        {isHaltAmount && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                                🚨 Halt Triggered (≥₦10k)
                                                            </span>
                                                        )}
                                                        {isWarningAmount && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                ⚠️ High Value (≥₦5k)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Balance Shift */}
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    <div className="text-gray-400">
                                                        ₦{Number(log.previousBalance).toLocaleString()}
                                                    </div>
                                                    <div className="text-gray-900 font-semibold flex items-center gap-1 mt-0.5">
                                                        <span className="text-emerald-500 font-bold">→</span> 
                                                        ₦{Number(log.newBalance).toLocaleString()}
                                                    </div>
                                                </td>

                                                {/* Source badge */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                        {badge.label}
                                                    </span>
                                                </td>

                                                {/* Reference */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs text-gray-600 truncate max-w-[140px]" title={log.reference}>
                                                            {log.reference || 'N/A'}
                                                        </span>
                                                        {log.reference && (
                                                            <button
                                                                onClick={() => handleCopy(log.reference)}
                                                                className="text-gray-400 hover:text-gray-700 p-1 rounded transition"
                                                                title="Copy reference"
                                                            >
                                                                {copiedRef === log.reference ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Timestamp */}
                                                <td className="px-6 py-4 text-xs text-gray-500">
                                                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                                                    <div className="font-mono text-[11px] text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedLog(log)}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="View full audit details"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {log.user && (
                                                            <button
                                                                onClick={() => {
                                                                    setHoldModalUser(log.user);
                                                                    setHoldReason('');
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors ${
                                                                    isHeld
                                                                        ? 'text-emerald-700 hover:bg-emerald-50'
                                                                        : 'text-red-600 hover:bg-red-50'
                                                                }`}
                                                                title={isHeld ? 'Release Security Hold' : 'Place Account on Security Hold'}
                                                            >
                                                                {isHeld ? <Unlock size={18} /> : <Lock size={18} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
                            <div>
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} records
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * limit >= pagination.total}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ArrowUpRight className="text-emerald-600" size={22} />
                                Wallet Credit Evidence
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 text-sm">
                            {/* Summary banner */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Amount Added</p>
                                    <p className="text-3xl font-extrabold text-emerald-700 mt-1">
                                        +₦{Number(selectedLog.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadge(selectedLog.type).bg}`}>
                                    {getTypeBadge(selectedLog.type).label}
                                </span>
                            </div>

                            {/* Key Values Grid */}
                            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">User Account:</span>
                                    <span className="font-bold text-gray-900">
                                        {selectedLog.user?.firstName} {selectedLog.user?.lastName} (#{selectedLog.userId})
                                    </span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Email:</span>
                                    <span className="text-gray-700 font-mono text-xs">{selectedLog.user?.email}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Phone:</span>
                                    <span className="text-gray-700 font-mono text-xs">{selectedLog.user?.phone}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Account Protection:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${selectedLog.user?.securityHold ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {selectedLog.user?.securityHold ? '🚨 SECURITY HOLD (HALTED)' : '✓ Active & Normal'}
                                    </span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Previous Balance:</span>
                                    <span className="font-mono text-gray-700">₦{Number(selectedLog.previousBalance).toLocaleString()}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">New Balance:</span>
                                    <span className="font-mono font-bold text-emerald-600">₦{Number(selectedLog.newBalance).toLocaleString()}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Reference:</span>
                                    <span className="font-mono text-xs text-gray-800 select-all">{selectedLog.reference || 'N/A'}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Initiated By:</span>
                                    <span className="text-gray-700 text-xs">{selectedLog.initiatedBy || 'System / Webhook'}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Client IP:</span>
                                    <span className="font-mono text-xs text-gray-700">{selectedLog.ipAddress || 'Not recorded'}</span>
                                </div>
                                <div className="p-3.5 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Timestamp:</span>
                                    <span className="text-gray-700 text-xs">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                                </div>
                                {selectedLog.description && (
                                    <div className="p-3.5 flex justify-between items-start">
                                        <span className="text-gray-500 font-medium">Note / Reason:</span>
                                        <span className="text-gray-700 text-xs text-right max-w-[280px]">{selectedLog.description}</span>
                                    </div>
                                )}
                            </div>

                            {/* Raw Metadata */}
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Payload Metadata</p>
                                    <pre className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-[11px] font-mono text-gray-200 overflow-x-auto max-h-40">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Actions inside modal */}
                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                                {selectedLog.user && (
                                    <Button
                                        variant={selectedLog.user?.securityHold ? 'primary' : 'danger'}
                                        onClick={() => {
                                            setHoldModalUser(selectedLog.user);
                                            setHoldReason('');
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        {selectedLog.user?.securityHold ? (
                                            <>
                                                <Unlock size={16} />
                                                <span>Release Security Hold</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={16} />
                                                <span>Hold User Account</span>
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hold / Unhold Confirmation Modal */}
            {holdModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${holdModalUser.securityHold ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {holdModalUser.securityHold ? <Unlock size={24} /> : <ShieldAlert size={24} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {holdModalUser.securityHold ? 'Release Security Hold' : 'Place Account on Security Hold'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {holdModalUser.firstName} {holdModalUser.lastName} ({holdModalUser.phone})
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                {holdModalUser.securityHold
                                    ? 'Releasing this hold will allow the user to log in, vend data/airtime, and conduct transactions again.'
                                    : 'Holding this user will immediately invalidate all active login sessions and block any outgoing transactions (vending, transfers, etc.) until manually cleared.'}
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Audit Reason:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder={holdModalUser.securityHold ? 'E.g. Investigated wallet additions and verified transactions are legitimate.' : 'E.g. Suspicious large wallet fundings; investigating account activity.'}
                                    value={holdReason}
                                    onChange={(e) => setHoldReason(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setHoldModalUser(null)}
                                disabled={actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={holdModalUser.securityHold ? 'primary' : 'danger'}
                                onClick={() => handleToggleSecurityHold(holdModalUser, !holdModalUser.securityHold)}
                                disabled={actionLoading}
                                className="flex items-center gap-2"
                            >
                                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{holdModalUser.securityHold ? 'Confirm Release' : 'Confirm Hold'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
