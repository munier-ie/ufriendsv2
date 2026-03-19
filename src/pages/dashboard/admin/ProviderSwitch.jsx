import React, { useState, useEffect } from 'react';
import { Network, ServerIcon, Save, Activity, Plus, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ProviderSwitch() {
    const [activeProviders, setActiveProviders] = useState([]);
    const [allProviders, setAllProviders] = useState([]);
    const [routingRules, setRoutingRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newRule, setNewRule] = useState({
        serviceType: 'data',
        network: 'MTN',
        networkType: 'SME',
        apiProviderId: ''
    });

    // List of major service categories we want to control (Global)
    const serviceCategories = [
        { id: 'data', name: 'Data Plans', icon: Network },
        { id: 'airtime', name: 'Airtime VTU', icon: Activity },
        { id: 'cable', name: 'Cable TV', icon: Activity },
        { id: 'electricity', name: 'Electricity Bills', icon: Activity },
        { id: 'exam', name: 'Exam Pins', icon: Activity },
    ];

    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    const networkTypes = ['SME', 'Gifting', 'Corporate', 'VTU', 'Share_Sell'];

    const [botStats, setBotStats] = useState({ lastSync: null, status: 'offline', pendingDiscoveries: 0 });
    const [syncing, setSyncing] = useState(false);

    const fetchBotStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/bot/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStats(res.data.stats);
        } catch (error) {
            console.error('Failed to fetch bot stats', error);
        }
    };

    const handleManualSync = async () => {
        if (!window.confirm('This will trigger a full pricing sync and routing comparison. Proceed?')) return;
        try {
            setSyncing(true);
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/bot/sync', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
            fetchBotStats();
            fetchData();
        } catch (error) {
            console.error('Bot sync failed', error);
            alert('Failed to trigger bot sync');
        } finally {
            setSyncing(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');

            // Fetch Global Status
            const statusRes = await axios.get('/api/admin/provider-status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveProviders(statusRes.data.activeProviders || []);
            setAllProviders(statusRes.data.allProviders || []);

            // Fetch Advanced Routing Rules
            const routingRes = await axios.get('/api/admin/routing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoutingRules(routingRes.data.routings || []);

            fetchBotStats();

        } catch (error) {
            console.error('Failed to fetch provider status/routing', error);
            alert('Failed to load active providers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Global Switch Logic ---
    const handleProviderChange = async (serviceType, apiProviderId) => {
        if (!apiProviderId) return;
        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/provider-status', { serviceType, apiProviderId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`${serviceType.toUpperCase()} global provider updated successfully!`);
            fetchData();
        } catch (error) {
            console.error('Update failed', error);
            alert(error.response?.data?.error || 'Failed to update active provider');
        } finally {
            setSaving(false);
        }
    };

    const getActiveProviderId = (serviceType) => {
        const found = activeProviders.find(p => p.serviceType === serviceType);
        return found ? found.apiProviderId : '';
    };

    // --- Advanced Routing Logic ---
    const handleAddRule = async (e) => {
        e.preventDefault();
        if (!newRule.apiProviderId) return alert('Please select a provider');

        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/routing', newRule, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Routing rule saved successfully!');
            fetchData();
        } catch (error) {
            console.error('Save rule failed', error);
            alert(error.response?.data?.error || 'Failed to save routing rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm('Are you sure you want to delete this routing rule?')) return;
        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/routing/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Routing rule deleted.');
            fetchData();
        } catch (error) {
            console.error('Delete rule failed', error);
            alert('Failed to delete routing rule');
        } finally {
            setSaving(false);
        }
    };

    if (loading && allProviders.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ServerIcon className="w-6 h-6 text-indigo-600" />
                        Provider Routing Switch
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Control global default providers and specific advanced routing overrides (e.g., MTN SME {'>'} Alrahuz).
                    </p>
                </div>
            </div>

            {/* Smart Routing Bot Status Panel */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-md overflow-hidden text-white mb-8">
                <div className="px-6 py-6 md:flex items-center justify-between">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Activity className={`w-8 h-8 ${syncing ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Smart Routing Bot</h2>
                            <div className="flex items-center gap-3 mt-1 text-indigo-100 text-sm">
                                <span className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${botStats.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                    {botStats.status === 'online' ? 'Automated Sync Active' : 'Offline'}
                                </span>
                                <span>•</span>
                                <span>Last Sync: {botStats.lastSync ? new Date(botStats.lastSync).toLocaleString() : 'Never'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right mr-4 hidden md:block">
                            <div className="text-2xl font-bold">{botStats.pendingDiscoveries}</div>
                            <div className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">New Discoveries</div>
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={syncing}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-70"
                        >
                            {syncing ? (
                                <><Loader2 className="animate-spin w-5 h-5" /> Syncing...</>
                            ) : (
                                <><Save className="w-5 h-5" /> Sync Now</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Provider Switch */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">Global Default Configuration</h2>
                    <p className="text-sm text-gray-500">These act as the basic fallback if no advanced network-specific rule exists.</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {serviceCategories.map((category) => {
                            const Icon = category.icon;
                            const currentProviderId = getActiveProviderId(category.id);

                            return (
                                <div key={category.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Default Provider
                                        </label>
                                        <select
                                            value={currentProviderId}
                                            onChange={(e) => handleProviderChange(category.id, e.target.value)}
                                            disabled={saving}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="" disabled>Select a provider...</option>
                                            {allProviders.map(provider => (
                                                <option key={provider.id} value={provider.id}>
                                                    {provider.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Advanced Routing Overrides */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-indigo-50/50">
                    <h2 className="text-lg font-semibold text-indigo-900">Advanced Network Routing Overrides</h2>
                    <p className="text-sm text-indigo-700">Override the global default for specific networks and types (e.g., send MTN SME to one provider and MTN Gifting to another).</p>
                </div>

                <div className="p-6">
                    {/* Add Rule Form */}
                    <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                            <select
                                value={newRule.serviceType}
                                onChange={(e) => setNewRule({ ...newRule, serviceType: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                                <option value="data">Data</option>
                                <option value="airtime">Airtime</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                            <select
                                value={newRule.network}
                                onChange={(e) => setNewRule({ ...newRule, network: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                                {networks.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type/Class</label>
                            <select
                                value={newRule.networkType}
                                onChange={(e) => setNewRule({ ...newRule, networkType: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                                {networkTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider Destination</label>
                            <select
                                value={newRule.apiProviderId}
                                onChange={(e) => setNewRule({ ...newRule, apiProviderId: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white"
                                required
                            >
                                <option value="" disabled>Select Provider...</option>
                                {allProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Rule
                            </button>
                        </div>
                    </form>

                    {/* Active Rules List */}
                    {routingRules.length > 0 ? (
                        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Service</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Network</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Designated Provider</th>
                                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Delete</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {routingRules.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 capitalize">
                                                {rule.serviceType}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 font-bold">
                                                {rule.network}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                                    {rule.networkType}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-indigo-600">
                                                {rule.apiProvider?.name || 'Unknown'}
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleDeleteRule(rule.id)}
                                                    disabled={saving}
                                                    className="text-red-600 hover:text-red-900 inline-flex items-center"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Network className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No routing overrides</h3>
                            <p className="mt-1 text-sm text-gray-500">Currently, all services are strictly following the Global Default Configuration.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Activity className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>How routing works:</strong> When a user buys Data or Airtime, the system checks the <strong>Advanced Routing Rules</strong> first. If a match is found (e.g. MTN SME {'>'} Alrahuz), that provider is used. If no match is found, it falls back to the <strong>Global Default Configuration</strong> set above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
