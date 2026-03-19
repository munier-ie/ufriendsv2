import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    TrendingUp,
    Activity,
    DollarSign,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    Loader
} from 'lucide-react';

/**
 * Vendor Analytics Dashboard
 * Provides comprehensive analytics for vendor accounts
 * including API usage metrics, revenue tracking, and performance monitoring
 */
const VendorAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('week'); // 'today', 'week', 'month'
    const [analytics, setAnalytics] = useState({
        overview: {
            totalCalls: 0,
            successRate: 0,
            avgResponseTime: 0,
            revenue: 0
        },
        callsOverTime: [],
        serviceDistribution: [],
        performance: [],
        recentTransactions: []
    });

    // Fetch analytics data
    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/analytics/overview?range=${dateRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Chart colors
    const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                                <Activity className="text-white" size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Vendor Analytics</h1>
                                <p className="text-gray-600">Monitor your API performance and revenue</p>
                            </div>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex space-x-2">
                            {[
                                { value: 'today', label: 'Today' },
                                { value: 'week', label: 'This Week' },
                                { value: 'month', label: 'This Month' }
                            ].map((range) => (
                                <button
                                    key={range.value}
                                    onClick={() => setDateRange(range.value)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${dateRange === range.value
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Key Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        icon={Zap}
                        title="Total API Calls"
                        value={analytics.overview.totalCalls.toLocaleString()}
                        color="blue"
                    />
                    <MetricCard
                        icon={CheckCircle}
                        title="Success Rate"
                        value={`${analytics.overview.successRate.toFixed(1)}%`}
                        color="green"
                    />
                    <MetricCard
                        icon={Clock}
                        title="Avg Response Time"
                        value={`${analytics.overview.avgResponseTime}ms`}
                        color="purple"
                    />
                    <MetricCard
                        icon={DollarSign}
                        title="Revenue"
                        value={`₦${analytics.overview.revenue.toLocaleString()}`}
                        color="orange"
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* API Calls Over Time */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <TrendingUp className="text-blue-600" />
                            <span>API Calls Over Time</span>
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.callsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="calls"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Service Distribution */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <Activity className="text-green-600" />
                            <span>Service Distribution</span>
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.serviceDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics.serviceDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Success vs Failed Transactions */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                        <BarChart className="text-purple-600" />
                        <span>Success vs Failed Transactions</span>
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.performance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="success" fill="#10b981" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent API Transactions */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Recent API Transactions</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Reference
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Service
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Amount
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Response Time
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.recentTransactions.map((txn, index) => (
                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                {txn.reference}
                                            </code>
                                        </td>
                                        <td className="py-3 px-4 capitalize">{txn.service}</td>
                                        <td className="py-3 px-4 font-semibold">₦{Math.abs(txn.amount).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            {txn.status === 0 ? (
                                                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    <CheckCircle size={14} />
                                                    <span>Success</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                    <XCircle size={14} />
                                                    <span>Failed</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{txn.responseTime}ms</td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {new Date(txn.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {analytics.recentTransactions.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No recent transactions
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ icon: Icon, title, value, color }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600'
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
                    <Icon className="text-white" size={24} />
                </div>
            </div>
            <p className="text-gray-600 text-sm mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    );
};

export default VendorAnalytics;
