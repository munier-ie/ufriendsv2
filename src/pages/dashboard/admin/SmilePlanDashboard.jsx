import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function SmilePlanDashboard() {
    const [plans, setPlans] = useState([]);
    const [providers, setProviders] = useState([]); // For dropdown
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        planName: '',
        planId: '',
        duration: '30 Days',
        dataSize: '',
        userPrice: '',
        agentPrice: '',
        vendorPrice: '',
        apiPrice: '',
        apiProviderId: '',
        active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/smile-plans', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data.plans);
            setProviders(res.data.providers);
        } catch (error) {
            console.error('Failed to fetch plans', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            planName: plan.planName,
            planId: plan.planId,
            duration: plan.duration,
            dataSize: plan.dataSize,
            userPrice: plan.userPrice,
            agentPrice: plan.agentPrice,
            vendorPrice: plan.vendorPrice,
            apiPrice: plan.apiPrice,
            apiProviderId: plan.apiProviderId || '',
            active: plan.active
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/smile-plans/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(plans.filter(p => p.id !== id));
        } catch (error) {
            alert('Failed to delete plan');
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/smile-plans/${id}/toggle`, { active: !currentStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(plans.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                ...formData,
                userPrice: parseFloat(formData.userPrice),
                agentPrice: parseFloat(formData.agentPrice),
                vendorPrice: parseFloat(formData.vendorPrice),
                apiPrice: parseFloat(formData.apiPrice),
                apiProviderId: formData.apiProviderId ? parseInt(formData.apiProviderId) : undefined
            };

            if (editingPlan) {
                await axios.put(`/api/admin/smile-plans/${editingPlan.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Plan updated successfully');
            } else {
                await axios.post('/api/admin/smile-plans', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Plan created successfully');
            }
            setModalOpen(false);
            setEditingPlan(null);
            fetchPlans();

            // Reset form
            setFormData({
                planName: '',
                planId: '',
                duration: '30 Days',
                dataSize: '',
                userPrice: '',
                agentPrice: '',
                vendorPrice: '',
                apiPrice: '',
                apiProviderId: '',
                active: true
            });

        } catch (error) {
            console.error(error);
            alert(error.response?.data?.error || 'Failed to save plan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Wifi className="w-6 h-6 mr-2 text-indigo-600" />
                    Smile Data Plans
                </h1>
                <Button onClick={() => { setEditingPlan(null); setModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add New Plan
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Network/Plan</th>
                                    <th className="px-6 py-3">Data Size</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3">Price (User/Agent/Vendor)</th>
                                    <th className="px-6 py-3">API Prov.</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {plans.map(plan => (
                                    <tr key={plan.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{plan.planName}</td>
                                        <td className="px-6 py-4">{plan.dataSize}</td>
                                        <td className="px-6 py-4">{plan.duration}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs">
                                                <span>U: ₦{plan.userPrice}</span>
                                                <span className="text-purple-600">A: ₦{plan.agentPrice}</span>
                                                <span className="text-orange-600">V: ₦{plan.vendorPrice}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {plan.apiProvider?.name || 'None'}
                                            <div className="text-[10px]">{plan.planId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(plan.id, plan.active)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${plan.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {plan.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(plan)} className="text-blue-600 hover:text-blue-800">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(plan.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {plans.length === 0 && (
                                    <tr><td colSpan="7" className="text-center py-8 text-gray-500">No plans found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'New Smile Data Plan'}</h2>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Plan Name"
                                value={formData.planName}
                                onChange={e => setFormData({ ...formData, planName: e.target.value })}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Data Size (e.g. 5GB)"
                                    value={formData.dataSize}
                                    onChange={e => setFormData({ ...formData, dataSize: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Duration (e.g. 30 Days)"
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="User Price"
                                    type="number"
                                    value={formData.userPrice}
                                    onChange={e => setFormData({ ...formData, userPrice: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Agent Price"
                                    type="number"
                                    value={formData.agentPrice}
                                    onChange={e => setFormData({ ...formData, agentPrice: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Vendor Price"
                                    type="number"
                                    value={formData.vendorPrice}
                                    onChange={e => setFormData({ ...formData, vendorPrice: e.target.value })}
                                    required
                                />
                                <Input
                                    label="API Cost Price"
                                    type="number"
                                    value={formData.apiPrice}
                                    onChange={e => setFormData({ ...formData, apiPrice: e.target.value })}
                                    required
                                    description="Cost from provider"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Provider</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                        value={formData.apiProviderId}
                                        onChange={e => setFormData({ ...formData, apiProviderId: e.target.value })}
                                    >
                                        <option value="">-- Select Provider --</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input
                                    label="API Plan ID"
                                    value={formData.planId}
                                    onChange={e => setFormData({ ...formData, planId: e.target.value })}
                                    required
                                    description="ID used by the API"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    id="activeCheck"
                                />
                                <label htmlFor="activeCheck" className="text-gray-700">Active</label>
                            </div>

                            <Button type="submit" className="w-full" loading={submitting}>
                                {editingPlan ? 'Update Plan' : 'Create Plan'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
