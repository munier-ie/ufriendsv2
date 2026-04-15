import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import BarChart from 'lucide-react/dist/esm/icons/bar-chart-2';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Download from 'lucide-react/dist/esm/icons/download';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Button from '../../../components/ui/Button';

// Simple bar chart visualization using HTML/CSS since we might not have recharts installed
const SimpleBarChart = ({ data, color }) => {
    if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400">No data</div>;

    const maxVal = Math.max(...data.map(d => d.value), 0);
    const hasData = maxVal > 0;

    return (
        <div className="h-64 flex items-end space-x-2 pt-10 pb-2">
            {data.map((item, idx) => {
                const heightPercent = hasData ? (item.value / maxVal) * 100 : 0;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div
                            className={`w-full ${color} rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm relative`}
                            style={{ height: `${Math.max(heightPercent, heightPercent > 0 ? 2 : 0)}%` }}
                        >
                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 shadow-xl pointer-events-none mb-2 border border-white/10">
                                {item.tooltip}
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-white/10"></div>
                            </div>
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-3 truncate w-full text-center uppercase tracking-tighter">{item.label}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default function SalesReport() {
    const [loading, setLoading] = useState(true);
    const [serviceStats, setServiceStats] = useState([]);
    const [dailyStats, setDailyStats] = useState([]);
    const [dateRange, setDateRange] = useState({ days: 7 });

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const [svcRes, dailyRes] = await Promise.all([
                axios.get('/api/admin/analytics/service-breakdown', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`/api/admin/analytics/daily-report?days=${dateRange.days}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setServiceStats(svcRes.data.breakdown);
            setDailyStats(dailyRes.data.report);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Simple CSV export
        const headers = ["Date", "Total Transactions", "Successful", "Failed", "Revenue", "Profit"];
        const rows = dailyStats.map(d => [
            d.date,
            d.total,
            d.successful,
            d.failed,
            d.revenue,
            d.profit
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sales_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                    Sales & Analytics
                </h1>
                <div className="flex gap-2">
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={dateRange.days}
                        onChange={e => setDateRange({ days: e.target.value })}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <Button onClick={handleExport} variant="outline" className="flex items-center">
                        <Download size={16} className="mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <BarChart size={18} className="mr-2 text-gray-500" /> Revenue Trend
                    </h3>
                    <SimpleBarChart
                        color="bg-green-500"
                        data={dailyStats.map(d => ({
                            label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
                            value: d.revenue,
                            tooltip: `₦${d.revenue.toLocaleString()} (${d.successful} txns)`
                        }))}
                    />
                </div>

                {/* Profit Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <TrendingUp size={18} className="mr-2 text-gray-500" /> Profit Trend
                    </h3>
                    <SimpleBarChart
                        color="bg-indigo-500"
                        data={dailyStats.map(d => ({
                            label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
                            value: d.profit,
                            tooltip: `₦${d.profit.toLocaleString()}`
                        }))}
                    />
                </div>
            </div>

            {/* Service Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Service Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Service Name</th>
                                <th className="px-6 py-3 text-right">Transactions</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {serviceStats.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{item.service || 'Unknown Service'}</td>
                                    <td className="px-6 py-4 text-right">{item.totalTransactions.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">₦{item.totalRevenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">₦{item.totalProfit.toLocaleString()}</td>
                                </tr>
                            ))}
                            {serviceStats.length === 0 && (
                                <tr><td colSpan="4" className="text-center py-8 text-gray-500">No data available for this period</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
