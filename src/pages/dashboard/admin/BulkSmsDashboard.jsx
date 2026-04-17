import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function BulkSmsDashboard() {
    const [activeTab, setActiveTab] = useState('logs');
    const [config, setConfig] = useState(null);
    const [logs, setLogs] = useState([]);
    const [apiProviders, setApiProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const [configRes, logsRes, provRes] = await Promise.all([
                axios.get('/api/admin/sms/config', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/sms/logs', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/providers', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setConfig(configRes.data.config);
            setLogs(logsRes.data.logs);
            setApiProviders(provRes.data);
        } catch (error) {
            console.error('Failed to fetch SMS data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/sms/config', config, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Settings updated successfully')
        } catch (error) {
            toast.error('Failed to update settings')
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="w-6 h-6 mr-2 text-indigo-600" />
                Bulk SMS Management
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'logs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Success Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-3 text-sm font-medium ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Pricing & Settings
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'logs' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500">{new Date(log.date).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div>{log.user.firstName}</div>
                                                <div className="text-xs text-gray-400">{log.user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">{log.description}</td>
                                            <td className="px-6 py-4 font-medium">₦{log.amount}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${log.status === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {log.status === 0 ? 'Success' : 'Failed'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No logs found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        config ? (
                            <form onSubmit={handleConfigUpdate} className="max-w-xl space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="User Price" type="number"
                                        value={config.price}
                                        onChange={e => setConfig({ ...config, price: e.target.value })}
                                    />
                                    <Input
                                        label="Agent Price" type="number"
                                        value={config.agentPrice}
                                        onChange={e => setConfig({ ...config, agentPrice: e.target.value })}
                                    />
                                    <Input
                                        label="Vendor Price" type="number"
                                        value={config.vendorPrice}
                                        onChange={e => setConfig({ ...config, vendorPrice: e.target.value })}
                                    />
                                    <Input
                                        label="API Cost" type="number"
                                        value={config.apiPrice}
                                        onChange={e => setConfig({ ...config, apiPrice: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Provider</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        value={config.apiProviderId || ''}
                                        onChange={e => setConfig({ ...config, apiProviderId: e.target.value })}
                                    >
                                        <option value="">-- Select Provider --</option>
                                        {apiProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        checked={config.active}
                                        onChange={e => setConfig({ ...config, active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <label>Active Service</label>
                                </div>
                                <Button type="submit" loading={submitting}>Save Settings</Button>
                            </form>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                SMS Service not found in system. Please seed 'Bulk SMS' service first.
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
