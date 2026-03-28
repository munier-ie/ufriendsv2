import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Activity, Wallet, Loader2, TrendingUp, Eye,
    UserCheck, UserCog, UserPlus, MessageSquare, ArrowRightLeft,
    ListFilter, BarChart3, PieChart, Shield, Smartphone, Zap, Tv,
    Search, Calendar, RefreshCcw, Bell
} from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.get('/api/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
                setError(false);
            } catch (error) {
                console.error('Failed to fetch admin stats', error);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-gray-400 font-medium animate-pulse">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-12">
                <div className="p-6 bg-red-50 text-red-500 rounded-full ring-8 ring-red-50/50">
                    <Activity size={40} />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-gray-900 font-bold text-2xl">Data Retrieval Failed</h3>
                    <p className="text-gray-500 text-sm max-w-sm">We couldn't connect to the analytics engine. Please check your connection and try again.</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="group px-8 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all font-semibold flex items-center space-x-2 shadow-lg shadow-primary/25 active:scale-95"
                >
                    <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span>Try Reconnecting</span>
                </button>
            </div>
        );
    }

    // StatCard component for consistent styling
    const StatCard = ({ icon: Icon, label, value, bgColor, iconColor, subtext, trend, trendUp = true }) => (
        <div className="bg-white p-6 sm:p-7 md:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 group relative overflow-hidden">
            {/* Background Watermark Icon */}
            <div className={`absolute -right-4 -bottom-4 ${iconColor} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700`}>
                <Icon size={120} strokeWidth={0.75} />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
                    {trend && (
                        <div className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${trendUp ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingUp className="rotate-180" size={12} />}
                            <span>{trend}</span>
                        </div>
                    )}
                </div>
                
                <div className="mt-auto">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-700 tracking-tight leading-tight mb-2 break-all overflow-hidden">{value}</h3>
                    {subtext && (
                        <p className="text-xs text-gray-400 font-medium flex items-center opacity-70">
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${bgColor.replace('bg-', 'bg-').replace('50', '400')}`}></span>
                            {subtext}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    const getStatusStyles = (status) => {
        switch (status) {
            case 0: return 'bg-emerald-50 text-emerald-600 ring-emerald-100'; // Success
            case 1: return 'bg-amber-50 text-amber-600 ring-amber-100'; // Pending
            case 2: return 'bg-rose-50 text-rose-600 ring-rose-100'; // Failed
            default: return 'bg-gray-50 text-gray-600 ring-gray-100';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 0: return 'Successful';
            case 1: return 'Processing';
            case 2: return 'Terminated';
            default: return 'Unknown';
        }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                        Platform <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Insights</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Real-time performance analytics and system monitoring</p>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <span className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-100 text-gray-600 font-semibold shadow-sm">
                        <Calendar size={18} className="text-primary" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                </div>
            </div>

            {/* Wallet Totals Section */}
            <div>
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Wallet size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 tracking-tight">Financial Overview</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    <StatCard
                        icon={Shield}
                        label="User Assets"
                        value={`₦${stats.wallets.user.toLocaleString()}`}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <StatCard
                        icon={UserPlus}
                        label="Agent Assets"
                        value={`₦${stats.wallets.agent.toLocaleString()}`}
                        bgColor="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />
                    <StatCard
                        icon={Zap}
                        label="Vendor Assets"
                        value={`₦${stats.wallets.vendor.toLocaleString()}`}
                        bgColor="bg-violet-50"
                        iconColor="text-violet-600"
                    />
                    <StatCard
                        icon={MessageSquare}
                        label="Commission Assets"
                        value={`₦${stats.wallets.referral.toLocaleString()}`}
                        bgColor="bg-amber-50"
                        iconColor="text-amber-600"
                    />
                    <StatCard
                        icon={BarChart3}
                        label="Total System Value"
                        value={`₦${stats.wallets.total.toLocaleString()}`}
                        bgColor="bg-gray-900"
                        iconColor="text-white"
                        subtext="Aggregated balance"
                    />
                </div>
            </div>

            {/* User Counts Section */}
            <div>
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Users size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 tracking-tight">Growth & Adoption</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    <StatCard
                        icon={Users}
                        label="Total Subscribers"
                        value={stats.users.subscribers.toLocaleString()}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <StatCard
                        icon={UserCheck}
                        label="Active Agents"
                        value={stats.users.agents.toLocaleString()}
                        bgColor="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />
                    <StatCard
                        icon={UserCog}
                        label="Registered Vendors"
                        value={stats.users.vendors.toLocaleString()}
                        bgColor="bg-violet-50"
                        iconColor="text-violet-600"
                    />
                    <StatCard
                        icon={UserPlus}
                        label="New Referrals"
                        value={stats.users.referrals.toLocaleString()}
                        bgColor="bg-amber-50"
                        iconColor="text-amber-600"
                    />
                    <StatCard
                        icon={Activity}
                        label="User Ecosystem"
                        value={stats.users.total.toLocaleString()}
                        bgColor="bg-gray-900"
                        iconColor="text-white"
                        subtext="Across all tiers"
                    />
                </div>
            </div>

            {/* API Wallets Section */}
            {stats.apiWallets && stats.apiWallets.length > 0 && (
                <div>
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Smartphone size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 tracking-tight">API Provider Monitoring</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {stats.apiWallets.map((wallet, index) => (
                            <div key={index} className="bg-white p-6 sm:p-7 md:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                                {/* Watermark Icon */}
                                <div className={`absolute -right-4 -bottom-4 ${wallet.balance < wallet.lowBalanceAlert ? 'text-red-500' : 'text-indigo-500'} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700`}>
                                    <Smartphone size={120} strokeWidth={0.75} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1 opacity-70">{wallet.provider}</p>
                                        {wallet.balance < wallet.lowBalanceAlert && (
                                            <div className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse uppercase tracking-wider">Critical</div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <h3 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight break-all ${wallet.balance < wallet.lowBalanceAlert ? 'text-red-500' : 'text-gray-800'}`}>
                                            ₦{wallet.balance.toLocaleString()}
                                        </h3>
                                        <div className="mt-5 w-full bg-gray-50 h-1 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${wallet.balance < wallet.lowBalanceAlert ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min(100, (wallet.balance / (wallet.lowBalanceAlert * 3)) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Metrics Section */}
            <div>
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                        <PieChart size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 tracking-tight">Operations Metrics</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Activity}
                        label="Total Transactions"
                        value={stats.transactions.total.toLocaleString()}
                        bgColor="bg-indigo-50"
                        iconColor="text-indigo-600"
                        subtext="All-time processed"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="System Profit"
                        value={`₦${stats.transactions.profit.toLocaleString()}`}
                        bgColor="bg-emerald-50"
                        iconColor="text-emerald-600"
                        subtext="Net commission"
                        trend="+12.5%"
                        trendUp={true}
                    />
                    <StatCard
                        icon={Bell}
                        label="Open Support"
                        value={stats.activity.unreadMessages.toLocaleString()}
                        bgColor="bg-rose-50"
                        iconColor="text-rose-600"
                        subtext="Requires attention"
                        trend={stats.activity.unreadMessages > 10 ? "+2" : "-5%"}
                        trendUp={stats.activity.unreadMessages <= 10}
                    />
                    <StatCard
                        icon={ArrowRightLeft}
                        label="Topup Requests"
                        value={stats.activity.activeAlphaRequests.toLocaleString()}
                        bgColor="bg-amber-50"
                        iconColor="text-amber-600"
                        subtext="Pending validation"
                    />
                </div>
            </div>

            {/* Recent Transactions Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                            <ListFilter size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 tracking-tight">Recent Activity Log</h2>
                    </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Transaction Ref</th>
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Product / Service</th>
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Execution</th>
                                    <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stats.transactions.recent.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-primary font-mono bg-primary/5 px-2 py-1 rounded-lg">
                                                {tx.reference.substring(0, 8)}...
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">
                                                    {tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'System Agent'}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {tx.user ? tx.user.email : 'AUTO_PROCESS'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{tx.serviceName}</span>
                                                <span className="text-xs text-gray-400 truncate max-w-[200px]">{tx.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-800">
                                                ₦{Math.abs(tx.amount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-4 py-1.5 inline-flex text-[11px] font-bold uppercase tracking-wider rounded-full ring-1 ring-inset ${getStatusStyles(tx.status)}`}>
                                                {getStatusText(tx.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col text-right md:text-left">
                                                <span className="text-xs font-bold text-gray-700">
                                                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {stats.transactions.recent.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center space-y-3">
                                                <div className="p-4 bg-gray-50 text-gray-300 rounded-full">
                                                    <Search size={32} />
                                                </div>
                                                <p className="text-gray-400 text-sm font-semibold tracking-tight">No transactional data found in this period</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
