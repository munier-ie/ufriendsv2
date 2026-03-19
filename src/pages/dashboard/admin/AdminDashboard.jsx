import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Activity, Wallet, Loader2, TrendingUp, Eye,
    UserCheck, UserCog, UserPlus, MessageSquare, ArrowRightLeft,
    ListFilter
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
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="p-4 bg-red-100 text-red-600 rounded-full">
                    <Activity size={32} />
                </div>
                <div className="text-gray-800 font-bold text-xl text-center">Failed to load dashboard statistics</div>
                <p className="text-gray-500 text-sm text-center max-w-md">There was a problem fetching the data from the server. Ensure the backend is running and you have proper permissions.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors bg-gradient-to-r from-primary to-secondary font-medium shadow-md shadow-primary/20"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    // StatCard component for consistent styling
    const StatCard = ({ icon: Icon, label, value, bgColor, iconColor, subtext }) => (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center space-x-4">
                <div className={`p-4 ${bgColor} ${iconColor} rounded-xl`}>
                    <Icon size={32} />
                </div>
                <div className="flex-1">
                    <p className="text-gray-500 text-sm font-medium">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
                </div>
            </div>
        </div>
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 0: return 'bg-green-100 text-green-800'; // Success
            case 1: return 'bg-yellow-100 text-yellow-800'; // Pending
            case 2: return 'bg-red-100 text-red-800'; // Failed
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 0: return 'Success';
            case 1: return 'Pending';
            case 2: return 'Failed';
            default: return 'Unknown';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-2">Comprehensive overview of platform statistics</p>
            </div>

            {/* Wallet Totals Section */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">💰 Wallet Balances</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard
                        icon={Wallet}
                        label="User Wallets"
                        value={`₦${stats.wallets.user.toLocaleString()}`}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <StatCard
                        icon={Wallet}
                        label="Agent Wallets"
                        value={`₦${stats.wallets.agent.toLocaleString()}`}
                        bgColor="bg-green-50"
                        iconColor="text-green-600"
                    />
                    <StatCard
                        icon={Wallet}
                        label="Vendor Wallets"
                        value={`₦${stats.wallets.vendor.toLocaleString()}`}
                        bgColor="bg-purple-50"
                        iconColor="text-purple-600"
                    />
                    <StatCard
                        icon={Wallet}
                        label="Referral Wallets"
                        value={`₦${stats.wallets.referral.toLocaleString()}`}
                        bgColor="bg-orange-50"
                        iconColor="text-orange-600"
                    />
                    <StatCard
                        icon={Wallet}
                        label="Total System Balance"
                        value={`₦${stats.wallets.total.toLocaleString()}`}
                        bgColor="bg-gradient-to-br from-primary/10 to-secondary/10"
                        iconColor="text-primary"
                        subtext="All wallets combined"
                    />
                </div>
            </div>

            {/* User Counts Section */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">👥 User Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard
                        icon={Users}
                        label="Subscribers"
                        value={stats.users.subscribers.toLocaleString()}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                        subtext="Regular users"
                    />
                    <StatCard
                        icon={UserCheck}
                        label="Agents"
                        value={stats.users.agents.toLocaleString()}
                        bgColor="bg-green-50"
                        iconColor="text-green-600"
                        subtext="Agent accounts"
                    />
                    <StatCard
                        icon={UserCog}
                        label="Vendors"
                        value={stats.users.vendors.toLocaleString()}
                        bgColor="bg-purple-50"
                        iconColor="text-purple-600"
                        subtext="Vendor accounts"
                    />
                    <StatCard
                        icon={UserPlus}
                        label="Referrals"
                        value={stats.users.referrals.toLocaleString()}
                        bgColor="bg-orange-50"
                        iconColor="text-orange-600"
                        subtext="Referred users"
                    />
                    <StatCard
                        icon={Users}
                        label="Total Users"
                        value={stats.users.total.toLocaleString()}
                        bgColor="bg-gradient-to-br from-primary/10 to-secondary/10"
                        iconColor="text-primary"
                        subtext="All user types"
                    />
                </div>
            </div>

            {/* API Wallets Section */}
            {stats.apiWallets && stats.apiWallets.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">🔌 API Provider Balances</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.apiWallets.map((wallet, index) => (
                            <div key={index} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-4 rounded-xl ${wallet.balance < wallet.lowBalanceAlert ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <Wallet size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-500 text-sm font-medium">{wallet.provider}</p>
                                        <h3 className={`text-2xl font-bold ${wallet.balance < wallet.lowBalanceAlert ? 'text-red-700' : 'text-gray-900'}`}>
                                            ₦{wallet.balance.toLocaleString()}
                                        </h3>
                                        {wallet.balance < wallet.lowBalanceAlert && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">LOW BALANCE ALERT</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Metrics Section */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Activity Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Activity}
                        label="Total Transactions"
                        value={stats.transactions.total.toLocaleString()}
                        bgColor="bg-indigo-50"
                        iconColor="text-indigo-600"
                        subtext="All-time transactions"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Total Profit"
                        value={`₦${stats.transactions.profit.toLocaleString()}`}
                        bgColor="bg-emerald-50"
                        iconColor="text-emerald-600"
                        subtext="From successful transactions"
                    />
                    <StatCard
                        icon={MessageSquare}
                        label="Unread Messages"
                        value={stats.activity.unreadMessages.toLocaleString()}
                        bgColor="bg-red-50"
                        iconColor="text-red-600"
                        subtext="Pending response"
                    />
                    <StatCard
                        icon={ArrowRightLeft}
                        label="Active Alpha Requests"
                        value={stats.activity.activeAlphaRequests.toLocaleString()}
                        bgColor="bg-orange-50"
                        iconColor="text-orange-600"
                        subtext="Pending alpha topup"
                    />
                </div>
            </div>

            {/* Recent Transactions Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">📋 Last 10 Transactions</h2>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.transactions.recent.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                            {tx.reference.substring(0, 15)}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'Unknown'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {tx.user ? tx.user.email : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{tx.serviceName}</div>
                                            <div className="text-xs text-gray-400">{tx.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            ₦{tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tx.status)}`}>
                                                {getStatusText(tx.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(tx.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </td>
                                    </tr>
                                ))}
                                {stats.transactions.recent.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No transactions found
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
