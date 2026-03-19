import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Search from 'lucide-react/dist/esm/icons/search';
import PhoneCall from 'lucide-react/dist/esm/icons/phone-call';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function AirtimeToCashDashboard() {
    const [activeTab, setActiveTab] = useState('requests'); // requests, history, settings
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rates, setRates] = useState([]);
    const [receivingNumber, setReceivingNumber] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeTab === 'requests') fetchRequests(0); // Pending
        if (activeTab === 'history') fetchRequests(); // All/Processed
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab]);

    const fetchRequests = async (status) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = status !== undefined ? { status } : {};
            const res = await axios.get('/api/admin/airtime-cash/requests', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setRequests(res.data.requests);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/airtime-cash/rates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRates(res.data.rates);
            setReceivingNumber(res.data.receivingNumber || '');
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status === 1 ? 'APPROVE' : 'REJECT'} this request?`)) return;

        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/airtime-cash/requests/${id}`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove from pending list or update in history
            if (activeTab === 'requests') {
                setRequests(requests.filter(r => r.id !== id));
            } else {
                fetchRequests();
            }
            alert(`Request ${status === 1 ? 'approved' : 'rejected'} successfully`);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveSettings = async () => {
        setProcessingId('settings');
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/airtime-cash/rates', { rates, receivingNumber }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Settings saved successfully');
        } catch (error) {
            alert('Failed to save settings');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRateChange = (network, field, value) => {
        setRates(rates.map(r => r.network === network ? { ...r, [field]: value } : r));
    };

    const filteredRequests = requests.filter(r =>
        r.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.phoneNumber?.includes(searchTerm) ||
        r.phoneNumber?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Airtime to Cash</h1>
                    <p className="text-gray-500">Manage conversion requests and rates</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'requests' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Pending Requests
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

            {/* Content Area */}
            {activeTab === 'settings' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Configuration
                    </h2>

                    <div className="space-y-6 max-w-2xl">
                        <div>
                            <Input
                                label="Receiving Phone Number(s)"
                                value={receivingNumber}
                                onChange={(e) => setReceivingNumber(e.target.value)}
                                placeholder="Separate multiple numbers with comma"
                                description="The number(s) users should transfer airtime to."
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-700">Conversion Rates (%)</h3>
                            {rates.map(rate => (
                                <div key={rate.network} className="flex items-center space-x-4 p-3 border rounded-lg">
                                    <span className={`w-20 font-bold ${rate.network === 'MTN' ? 'text-yellow-600' :
                                        rate.network === 'GLO' ? 'text-green-600' :
                                            rate.network === 'AIRTEL' ? 'text-red-600' : 'text-green-800'
                                        }`}>
                                        {rate.network}
                                    </span>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            label="Rate (%)"
                                            type="number"
                                            value={rate.rate}
                                            onChange={(e) => handleRateChange(rate.network, 'rate', e.target.value)}
                                            placeholder="Ex. 80"
                                            rightElement={<span className="text-gray-500">%</span>}
                                        />
                                        <Input
                                            label="Receiving Number"
                                            type="tel"
                                            value={rate.phoneNumber || ''}
                                            onChange={(e) => handleRateChange(rate.network, 'phoneNumber', e.target.value)}
                                            placeholder="Phone number"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={rate.active}
                                            onChange={(e) => handleRateChange(rate.network, 'active', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-600">Active</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            loading={processingId === 'settings'}
                            className="w-full"
                        >
                            Save Configuration
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by username or phone..."
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
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Network</th>
                                        <th className="px-6 py-3">Amount Needed</th>
                                        <th className="px-6 py-3">Pay Out</th>
                                        <th className="px-6 py-3">Sender Number</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                        {activeTab === 'requests' && <th className="px-6 py-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRequests.length > 0 ? (
                                        filteredRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{req.user?.username}</div>
                                                    <div className="text-gray-500 text-xs">{req.user?.fullName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold text-xs px-2 py-1 rounded ${req.network === 'MTN' ? 'bg-yellow-100 text-yellow-800' :
                                                        req.network === 'GLO' ? 'bg-green-100 text-green-800' :
                                                            req.network === 'AIRTEL' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-900'
                                                        }`}>
                                                        {req.network}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">₦{req.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 font-bold text-green-600">₦{req.receiveAmount.toLocaleString()}</td>
                                                <td className="px-6 py-4 font-mono text-gray-500">{req.phoneNumber}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        req.status === 1 ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {req.status === 0 ? 'Pending' : req.status === 1 ? 'Approved' : 'Rejected'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </td>
                                                {activeTab === 'requests' && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleProcess(req.id, 1)}
                                                            disabled={processingId === req.id}
                                                            className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded hover:bg-green-100"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcess(req.id, 2)}
                                                            disabled={processingId === req.id}
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
                                                No requests found
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
