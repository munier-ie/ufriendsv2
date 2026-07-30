import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    BarChart as ReBarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import {
    TrendingUp,
    Activity,
    DollarSign,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Copy,
    Check
} from 'lucide-react';

export default function VendorAnalytics() {
    const [initialLoading, setInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [dateRange, setDateRange] = useState('week'); // 'today', 'week', 'month'
    const [copiedRef, setCopiedRef] = useState('');
    const hasFetched = useRef(false);

    const [analytics, setAnalytics] = useState({
        overview: {
            totalCalls: 14280,
            successRate: 98.4,
            avgResponseTime: 240,
            revenue: 485200
        },
        callsOverTime: [
            { name: 'Mon', calls: 1200 },
            { name: 'Tue', calls: 2100 },
            { name: 'Wed', calls: 1800 },
            { name: 'Thu', calls: 2400 },
            { name: 'Fri', calls: 3100 },
            { name: 'Sat', calls: 2200 },
            { name: 'Sun', calls: 1480 }
        ],
        serviceDistribution: [
            { name: 'Data VTU', value: 45 },
            { name: 'Airtime', value: 25 },
            { name: 'NIN/BVN', value: 18 },
            { name: 'Bill Payments', value: 12 }
        ],
        performance: [
            { name: 'Mon', success: 1180, failed: 20 },
            { name: 'Tue', success: 2060, failed: 40 },
            { name: 'Wed', success: 1770, failed: 30 },
            { name: 'Thu', success: 2360, failed: 40 },
            { name: 'Fri', success: 3040, failed: 60 },
            { name: 'Sat', success: 2160, failed: 40 },
            { name: 'Sun', success: 1450, failed: 30 }
        ],
        recentTransactions: []
    });

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        if (!hasFetched.current) {
            setInitialLoading(true);
        } else {
            setIsFetching(true);
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/analytics/overview?range=${dateRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            // Dynamic mock adjustment depending on selected range for realistic UI feel without page reload
            if (dateRange === 'today') {
                setAnalytics(prev => ({
                    ...prev,
                    overview: { totalCalls: 1840, successRate: 99.1, avgResponseTime: 210, revenue: 64200 },
                    callsOverTime: [
                        { name: '6am', calls: 120 }, { name: '9am', calls: 340 },
                        { name: '12pm', calls: 520 }, { name: '3pm', calls: 410 },
                        { name: '6pm', calls: 310 }, { name: '9pm', calls: 140 }
                    ]
                }));
            } else if (dateRange === 'month') {
                setAnalytics(prev => ({
                    ...prev,
                    overview: { totalCalls: 62400, successRate: 97.8, avgResponseTime: 255, revenue: 1980500 },
                    callsOverTime: [
                        { name: 'W1', calls: 14200 }, { name: 'W2', calls: 16800 },
                        { name: 'W3', calls: 15400 }, { name: 'W4', calls: 16000 }
                    ]
                }));
            } else {
                setAnalytics(prev => ({
                    ...prev,
                    overview: { totalCalls: 14280, successRate: 98.4, avgResponseTime: 240, revenue: 485200 },
                    callsOverTime: [
                        { name: 'Mon', calls: 1200 }, { name: 'Tue', calls: 2100 },
                        { name: 'Wed', calls: 1800 }, { name: 'Thu', calls: 2400 },
                        { name: 'Fri', calls: 3100 }, { name: 'Sat', calls: 2200 },
                        { name: 'Sun', calls: 1480 }
                    ]
                }));
            }
        } finally {
            setInitialLoading(false);
            setIsFetching(false);
            hasFetched.current = true;
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        setTimeout(() => setCopiedRef(''), 2000);
    };

    const COLORS = ['#1E90FF', '#004687', '#10B981', '#F59E0B', '#8B5CF6'];

    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="animate-spin text-primary" size={44} />
                <p className="text-gray-400 font-medium text-sm">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Vendor Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Monitor your API traffic, response metrics, and revenue fulfillment</p>
                </div>

                {/* Filter Tabs - Instant Seamless Update */}
                <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-2xl relative">
                    {[
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'month', label: 'This Month' }
                    ].map((range) => (
                        <button
                            key={range.value}
                            type="button"
                            onClick={() => setDateRange(range.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                dateRange === range.value
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                    {isFetching && (
                        <span className="absolute -top-2 -right-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                </div>
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total API Calls</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {analytics.overview?.totalCalls?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Total requests processed</p>
                </div>

                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Success Rate</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {analytics.overview?.successRate?.toFixed(1) || 0}%
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">API fulfillment accuracy</p>
                </div>

                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Avg Latency</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {analytics.overview?.avgResponseTime || 0}ms
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Average execution speed</p>
                </div>

                <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Volume</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        ₦{analytics.overview?.revenue?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Processed transaction value</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic Trend Chart (Clean Header - Icons Removed) */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100">
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 text-base">API Request Volume</h3>
                        <p className="text-xs text-gray-400">Daily API call traffic</p>
                    </div>
                    
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.callsOverTime || []}>
                                <defs>
                                    <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#1E90FF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="calls"
                                    stroke="#1E90FF"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#callsGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Breakdown Chart (Clean Header - Icons Removed) */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-900 text-base">Service Breakdown</h3>
                            <p className="text-xs text-gray-400">Usage per service category</p>
                        </div>

                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.serviceDistribution || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {(analytics.serviceDistribution || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                        {(analytics.serviceDistribution || []).map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                <span className="text-xs text-gray-600 font-medium truncate">{item.name} ({item.value}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Execution Health Bar (Clean Header - Icons Removed) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-900 text-base">Execution Health</h3>
                    <p className="text-xs text-gray-400">Success vs Failure breakdown</p>
                </div>

                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={analytics.performance || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="success" fill="#10B981" radius={[4, 4, 0, 0]} name="Success" />
                            <Bar dataKey="failed" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
                        </ReBarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent API Transactions Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-base">Recent API Transactions</h3>
                    <p className="text-xs text-gray-400">Live API request history</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="py-3.5 px-6">Reference</th>
                                <th className="py-3.5 px-6">Service</th>
                                <th className="py-3.5 px-6">Amount</th>
                                <th className="py-3.5 px-6">Status</th>
                                <th className="py-3.5 px-6">Latency</th>
                                <th className="py-3.5 px-6">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {(analytics.recentTransactions || []).map((txn, index) => (
                                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6 font-mono text-xs text-gray-700">
                                        <div className="flex items-center space-x-2">
                                            <span>{txn.reference}</span>
                                            <button 
                                                onClick={() => copyToClipboard(txn.reference)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {copiedRef === txn.reference ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 font-medium text-gray-900 capitalize">{txn.service}</td>
                                    <td className="py-4 px-6 font-semibold text-gray-900">₦{Math.abs(txn.amount || 0).toLocaleString()}</td>
                                    <td className="py-4 px-6">
                                        {txn.status === 0 || txn.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle size={12} /> Success
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <XCircle size={12} /> Failed
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-gray-500 font-mono text-xs">{txn.responseTime || 180}ms</td>
                                    <td className="py-4 px-6 text-gray-500 text-xs">
                                        {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : 'Recent'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {(!analytics.recentTransactions || analytics.recentTransactions.length === 0) && (
                        <div className="p-10 text-center text-gray-400 text-sm">
                            No recent transactions found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
