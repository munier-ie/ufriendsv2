import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Server from 'lucide-react/dist/esm/icons/server';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Tv from 'lucide-react/dist/esm/icons/tv';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Database from 'lucide-react/dist/esm/icons/database';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Button from '../../../components/ui/Button';

const TYPE_CONFIG = {
    data:  { label: 'Data Plans',   icon: Database,       color: 'blue',  bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
    cable: { label: 'Cable TV',     icon: Tv,             color: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    exam:  { label: 'Exam Pins',    icon: GraduationCap,  color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
};

export default function BotDiscoveredPlans() {
    const [counts, setCounts]         = useState({ data: 0, cable: 0, exam: 0, total: 0 });
    const [plans, setPlans]           = useState([]);
    const [activeTab, setActiveTab]   = useState('all');
    const [loading, setLoading]       = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [toast, setToast]           = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchDiscoveredPlans = useCallback(async (tab = activeTab) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/bot/discovered-plans', {
                headers: { Authorization: `Bearer ${token}` },
                params: { type: 'all', limit: 200 }
            });
            const all = res.data.plans || [];
            setCounts(res.data.counts || { data: 0, cable: 0, exam: 0, total: 0 });
            setPlans(all);
        } catch (error) {
            console.error('Failed to fetch discovered plans', error);
            showToast('Failed to load discovered plans', 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchDiscoveredPlans(); }, []);

    const filteredPlans = activeTab === 'all' ? plans : plans.filter(p => p._type === activeTab);

    const handleActivate = async (plan) => {
        if (!window.confirm(`Activate this ${plan._type === 'data' ? 'data plan' : plan._type === 'cable' ? 'cable TV plan' : 'exam pin'} across the platform?`)) return;
        setProcessingId(plan.id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/bot/discovered-plans/${plan.id}/activate`,
                { serviceType: plan._type },
                { headers: { Authorization: `Bearer ${token}` }, params: { serviceType: plan._type } }
            );
            showToast(`✅ "${plan.displayName}" activated successfully!`);
            fetchDiscoveredPlans();
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to activate plan', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (plan) => {
        if (!window.confirm(`Permanently dismiss this plan? This cannot be undone.`)) return;
        setProcessingId(plan.id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/bot/discovered-plans/${plan.id}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { serviceType: plan._type }
            });
            showToast(`Plan dismissed.`, 'warning');
            fetchDiscoveredPlans();
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to dismiss plan', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleBulkActivate = async () => {
        const label = activeTab === 'all' ? 'ALL discovered plans' : `ALL ${TYPE_CONFIG[activeTab]?.label || activeTab} plans`;
        if (!window.confirm(`Activate ${label}? They will go live immediately.`)) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put('/api/admin/bot/discovered-plans/activate-all',
                { type: activeTab },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast(`✅ ${res.data.count} plan(s) activated!`);
            fetchDiscoveredPlans();
        } catch (error) {
            showToast(error.response?.data?.error || 'Bulk activation failed', 'error');
            setLoading(false);
        }
    };

    const tabs = [
        { key: 'all',   label: 'All',        count: counts.total },
        { key: 'data',  label: 'Data Plans',  count: counts.data  },
        { key: 'cable', label: 'Cable TV',    count: counts.cable },
        { key: 'exam',  label: 'Exam Pins',   count: counts.exam  },
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all
                    ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="text-yellow-500" /> Smart Bot — Discovered Plans
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Review new plans automatically discovered from providers. Activate to make them live.
                    </p>
                </div>
                {counts.total > 0 && (
                    <Button
                        onClick={handleBulkActivate}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                    >
                        <CheckCircle size={18} className="mr-2" />
                        Activate {activeTab === 'all' ? 'All' : TYPE_CONFIG[activeTab]?.label} ({activeTab === 'all' ? counts.total : counts[activeTab] || 0})
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Discovered', value: counts.total, icon: Server, color: 'blue' },
                    { label: 'Data Plans',        value: counts.data,  icon: Database, color: 'blue' },
                    { label: 'Cable TV Plans',    value: counts.cable, icon: Tv, color: 'purple' },
                    { label: 'Exam Pins',         value: counts.exam,  icon: GraduationCap, color: 'orange' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center flex-shrink-0`}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">{label}</p>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all
                            ${activeTab === tab.key
                                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {tab.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold
                            ${activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                ) : filteredPlans.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <ShieldAlert size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No plans pending review</p>
                        <p className="text-sm mt-1">
                            {activeTab === 'all'
                                ? 'Run the bot to scan providers for new plans.'
                                : `No new ${TYPE_CONFIG[activeTab]?.label} discovered yet.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Type</th>
                                    <th className="p-4 font-semibold text-gray-600">Plan Details</th>
                                    <th className="p-4 font-semibold text-gray-600">Provider</th>
                                    <th className="p-4 font-semibold text-gray-600">Code / ID</th>
                                    <th className="p-4 font-semibold text-gray-600">User Price</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPlans.map(plan => {
                                    const cfg = TYPE_CONFIG[plan._type] || TYPE_CONFIG.data;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={`${plan._type}-${plan.id}`} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Type Badge */}
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                                                    <Icon size={11} /> {cfg.label}
                                                </span>
                                            </td>

                                            {/* Plan Name */}
                                            <td className="p-4 font-medium text-gray-900">
                                                {plan.displayName}
                                                {plan._type === 'data' && (
                                                    <span className="ml-2 text-xs text-gray-400">{plan.duration}</span>
                                                )}
                                            </td>

                                            {/* Provider */}
                                            <td className="p-4 text-gray-600 text-sm">
                                                {plan.apiProvider?.name || '—'}
                                            </td>

                                            {/* Code */}
                                            <td className="p-4 font-mono text-xs text-gray-500 bg-gray-50">
                                                {plan.displayCode || '—'}
                                            </td>

                                            {/* Price */}
                                            <td className="p-4 font-bold text-gray-900">
                                                ₦{(plan.displayPrice ?? 0).toLocaleString()}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleActivate(plan)}
                                                        loading={processingId === plan.id}
                                                        disabled={processingId !== null && processingId !== plan.id}
                                                    >
                                                        <CheckCircle size={13} className="mr-1" /> Activate
                                                    </Button>
                                                    <button
                                                        onClick={() => handleDismiss(plan)}
                                                        disabled={processingId !== null}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                                                        title="Dismiss"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
