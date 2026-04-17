import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle, Activity } from 'lucide-react';

export default function DataPlanManagement() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        network: 'MTN',
        dataName: '',
        dataType: 'SME',
        planId: '',
        duration: '30 Days',
        userPrice: '',
        agentPrice: '',
        vendorPrice: '',
        apiPrice: '',
        referralCommission: '',
        active: true
    });

    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    const dataTypes = ['SME', 'GIFTING', 'CORPORATE', 'COUPON'];
    const [filterNetwork, setFilterNetwork] = useState('');

    useEffect(() => {
        fetchPlans();
    }, [filterNetwork]);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const url = filterNetwork
                ? `/api/admin/services/data-plans?network=${filterNetwork}`
                : '/api/admin/services/data-plans';

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data.plans || []);
        } catch (error) {
            console.error('Failed to fetch data plans', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('adminToken');

            if (editingPlan) {
                await axios.put(
                    `/api/admin/services/data-plans/${editingPlan.id}`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Data plan updated successfully')
            } else {
                await axios.post(
                    '/api/admin/services/data-plans',
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Data plan created successfully')
            }

            setShowModal(false);
            resetForm();
            fetchPlans();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save data plan')
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (plan) => {
        if (!confirm(`Delete ${plan.network} ${plan.dataName}?`)) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/services/data-plans/${plan.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Data plan deleted successfully')
            fetchPlans();
        } catch (error) {
            toast.error('Failed to delete data plan')
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            network: plan.network,
            dataName: plan.dataName,
            dataType: plan.dataType,
            planId: plan.planId,
            duration: plan.duration,
            userPrice: plan.userPrice.toString(),
            agentPrice: plan.agentPrice.toString(),
            vendorPrice: plan.vendorPrice.toString(),
            apiPrice: plan.apiPrice.toString(),
            referralCommission: plan.referralCommission?.toString() || '',
            active: plan.active
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingPlan(null);
        setFormData({
            network: 'MTN',
            dataName: '',
            dataType: 'SME',
            planId: '',
            duration: '30 Days',
            userPrice: '',
            agentPrice: '',
            vendorPrice: '',
            apiPrice: '',
            referralCommission: '',
            active: true
        });
    };

    const groupedPlans = plans.reduce((acc, plan) => {
        if (!acc[plan.network]) acc[plan.network] = [];
        acc[plan.network].push(plan);
        return acc;
    }, {});

    if (loading && !plans.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Data Plan Management
                    </h1>
                    <p className="text-gray-600 mt-1">{plans.length} plans configured</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
                >
                    <Plus size={20} />
                    <span>Add Data Plan</span>
                </button>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setFilterNetwork('')}
                    className={`px-4 py-2 rounded-xl transition-colors ${!filterNetwork ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    All Networks
                </button>
                {networks.map(network => (
                    <button
                        key={network}
                        onClick={() => setFilterNetwork(network)}
                        className={`px-4 py-2 rounded-xl transition-colors ${filterNetwork === network ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        {network}
                    </button>
                ))}

                <div className="flex-grow"></div>

                <button
                    onClick={() => {
                        // Toggle a special review mode or just filter for inactive bot-discovered plans
                        // For simplicity, we'll just filter our current plans array
                        const pendingCount = plans.filter(p => !p.active && p.apiProviderId).length;
                        if (pendingCount === 0) return toast.error('No pending discoveries to review.')

                        setPlans(plans.filter(p => !p.active && p.apiProviderId));
                    }}
                    className="px-4 py-2 rounded-xl bg-yellow-100 text-yellow-800 border-2 border-yellow-200 hover:bg-yellow-200 transition-colors font-semibold flex items-center gap-2"
                >
                    <Activity size={18} />
                    Review Pending ({plans.filter(p => !p.active && p.apiProviderId).length})
                </button>
            </div>

            {/* Plans by Network */}
            <div className="space-y-6">
                {Object.entries(groupedPlans).map(([network, networkPlans]) => (
                    <div key={network} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">{network} Data Plans ({networkPlans.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Duration</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Agent Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vendor Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">API Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ref Comm (%)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {networkPlans.map(plan => (
                                        <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold">{plan.dataName}</div>
                                                    {!plan.active && plan.apiProviderId && (
                                                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded border border-yellow-200 font-bold uppercase">
                                                            Bot Discovered
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                                                    {plan.dataType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{plan.duration}</td>
                                            <td className="px-6 py-4 font-semibold">₦{plan.userPrice.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-semibold">₦{plan.agentPrice.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-semibold">₦{plan.vendorPrice.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-semibold">₦{plan.apiPrice.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-semibold text-orange-600">{plan.referralCommission || 0}%</td>
                                            <td className="px-6 py-4">
                                                {plan.active ? (
                                                    <span className="flex items-center text-green-600">
                                                        <CheckCircle size={16} className="mr-1" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-red-600">
                                                        <XCircle size={16} className="mr-1" /> Disabled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(plan)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(plan)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6">{editingPlan ? 'Edit' : 'Add'} Data Plan</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Network *</label>
                                    <select
                                        value={formData.network}
                                        onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        {networks.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 1GB, 2GB, 5GB"
                                        value={formData.dataName}
                                        onChange={(e) => setFormData({ ...formData, dataName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Type *</label>
                                    <select
                                        value={formData.dataType}
                                        onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Plan ID *</label>
                                    <input
                                        type="text"
                                        placeholder="External API Plan ID"
                                        value={formData.planId}
                                        onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 30 Days, Weekly"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">User Price (₦) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.userPrice}
                                        onChange={(e) => setFormData({ ...formData, userPrice: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Agent Price (₦) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.agentPrice}
                                        onChange={(e) => setFormData({ ...formData, agentPrice: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Price (₦) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.vendorPrice}
                                        onChange={(e) => setFormData({ ...formData, vendorPrice: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">API Price (₦) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.apiPrice}
                                        onChange={(e) => setFormData({ ...formData, apiPrice: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Referral Commission (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.referralCommission}
                                    onChange={(e) => setFormData({ ...formData, referralCommission: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary rounded"
                                />
                                <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                                    Active (available for purchase)
                                </label>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editingPlan ? 'Update Plan' : 'Create Plan')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
