import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Search from 'lucide-react/dist/esm/icons/search';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function AlphaTopupDashboard() {
    const [activeTab, setActiveTab] = useState('orders'); // orders, history, settings
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rates, setRates] = useState({ userRate: 0, agentRate: 0, vendorRate: 0, buyingRate: 0, referralCommission: 0 });
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders(0); // Pending
        if (activeTab === 'history') fetchOrders(); // All
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab]);

    const fetchOrders = async (status) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = status !== undefined ? { status } : {};
            const res = await axios.get('/api/admin/alpha-topup/orders', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setOrders(res.data.orders);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/alpha-topup/rates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRates(res.data.rates);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status === 1 ? 'APPROVE' : 'REJECT'} this order?`)) return;

        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/alpha-topup/orders/${id}`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (activeTab === 'orders') {
                setOrders(orders.filter(o => o.id !== id));
            } else {
                fetchOrders();
            }
            toast.success(`Order ${status === 1 ? 'approved' : 'rejected'} successfully`)
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to process order')
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveSettings = async () => {
        setProcessingId('settings');
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/alpha-topup/rates', rates, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Rates updated successfully')
        } catch (error) {
            toast.error('Failed to update rates')
        } finally {
            setProcessingId(null);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Alpha Topup</h1>
                    <p className="text-gray-500">Manage Alpha Topup orders and rate configuration</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Pending Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'settings' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Pricing Configuration
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                        <Input
                            label="User Price (₦)"
                            type="number"
                            value={rates.userRate}
                            onChange={(e) => setRates({ ...rates, userRate: e.target.value })}
                        />
                        <Input
                            label="Agent Price (₦)"
                            type="number"
                            value={rates.agentRate}
                            onChange={(e) => setRates({ ...rates, agentRate: e.target.value })}
                        />
                        <Input
                            label="Vendor Price (₦)"
                            type="number"
                            value={rates.vendorRate}
                            onChange={(e) => setRates({ ...rates, vendorRate: e.target.value })}
                        />
                        <Input
                            label="Buying Rate (₦)"
                            type="number"
                            value={rates.buyingRate}
                            onChange={(e) => setRates({ ...rates, buyingRate: e.target.value })}
                            description="Rate at which values are bought"
                        />
                        <Input
                            label="Referral Commission (₦)"
                            type="number"
                            value={rates.referralCommission}
                            onChange={(e) => setRates({ ...rates, referralCommission: e.target.value })}
                        />

                        <div className="md:col-span-2 pt-4">
                            <Button
                                onClick={handleSaveSettings}
                                loading={processingId === 'settings'}
                                className="w-full"
                            >
                                Update Rates
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search order or username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Order ID</th>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Rate</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Proof</th>
                                        {activeTab === 'orders' && <th className="px-6 py-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-mono text-gray-500">#{order.id}</td>
                                                <td className="px-6 py-4 font-medium">{order.user?.username}</td>
                                                <td className="px-6 py-4">₦{order.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">{order.rate}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        order.status === 1 ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {order.status === 0 ? 'Pending' : order.status === 1 ? 'Completed' : 'Rejected'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    {order.proof ? (
                                                        <a href={order.proof} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                                                    ) : 'None'}
                                                </td>
                                                {activeTab === 'orders' && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleProcess(order.id, 1)}
                                                            disabled={processingId === order.id}
                                                            className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded hover:bg-green-100"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcess(order.id, 2)}
                                                            disabled={processingId === order.id}
                                                            className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded hover:bg-red-100"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                                No orders found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
