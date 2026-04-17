import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function ExamPinDashboard() {
    const [pins, setPins] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPin, setEditingPin] = useState(null);
    const [formData, setFormData] = useState({
        examType: 'WAEC',
        quantity: 1,
        userPrice: '',
        agentPrice: '',
        vendorPrice: '',
        apiPrice: '',
        referralCommission: '',
        apiProviderId: '',
        active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPins();
    }, []);

    const fetchPins = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/exam-pins', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPins(res.data.pins);
            setProviders(res.data.providers);
        } catch (error) {
            console.error('Failed to fetch exam pins', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pin) => {
        setEditingPin(pin);
        setFormData({
            examType: pin.examType,
            quantity: pin.quantity,
            userPrice: pin.userPrice,
            agentPrice: pin.agentPrice,
            vendorPrice: pin.vendorPrice,
            apiPrice: pin.apiPrice,
            referralCommission: pin.referralCommission || '',
            apiProviderId: pin.apiProviderId || '',
            active: pin.active
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this configuration?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/exam-pins/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPins(pins.filter(p => p.id !== id));
        } catch (error) {
            toast.error('Failed to delete configuration')
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                ...formData,
                quantity: parseInt(formData.quantity),
                userPrice: parseFloat(formData.userPrice),
                agentPrice: parseFloat(formData.agentPrice),
                vendorPrice: parseFloat(formData.vendorPrice),
                apiPrice: parseFloat(formData.apiPrice),
                referralCommission: parseFloat(formData.referralCommission || 0),
                apiProviderId: formData.apiProviderId ? parseInt(formData.apiProviderId) : undefined
            };

            if (editingPin) {
                await axios.put(`/api/admin/exam-pins/${editingPin.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Configuration updated successfully')
            } else {
                await axios.post('/api/admin/exam-pins', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Configuration added successfully')
            }
            setModalOpen(false);
            setEditingPin(null);
            fetchPins();

            // Reset form
            setFormData({
                examType: 'WAEC',
                quantity: 1,
                userPrice: '',
                agentPrice: '',
                vendorPrice: '',
                apiPrice: '',
                referralCommission: '',
                apiProviderId: '',
                active: true
            });

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to save configuration')
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <GraduationCap className="w-6 h-6 mr-2 text-indigo-600" />
                    Exam Pin Settings
                </h1>
                <Button onClick={() => { setEditingPin(null); setModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Configurations
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
                                    <th className="px-6 py-3">Exam Type</th>
                                    <th className="px-6 py-3">Quantity</th>
                                    <th className="px-6 py-3">Price (User/Agent/Vendor)</th>
                                    <th className="px-6 py-3">API Prov.</th>
                                    <th className="px-6 py-3 text-orange-600">Ref Comm</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pins.map(pin => (
                                    <tr key={pin.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{pin.examType}</td>
                                        <td className="px-6 py-4">{pin.quantity}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs">
                                                <span>U: ₦{pin.userPrice}</span>
                                                <span className="text-purple-600">A: ₦{pin.agentPrice}</span>
                                                <span className="text-orange-600">V: ₦{pin.vendorPrice}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-orange-600 font-bold">
                                            ₦{pin.referralCommission?.toLocaleString() || '0'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {pin.apiProvider?.name || 'None'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${pin.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {pin.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(pin)} className="text-blue-600 hover:text-blue-800">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(pin.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pins.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-8 text-gray-500">No configurations found</td></tr>
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
                            <h2 className="text-xl font-bold">{editingPin ? 'Edit Configuration' : 'New Configuration'}</h2>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                        value={formData.examType}
                                        onChange={e => setFormData({ ...formData, examType: e.target.value })}
                                    >
                                        <option value="WAEC">WAEC</option>
                                        <option value="NECO">NECO</option>
                                        <option value="NABTEB">NABTEB</option>
                                    </select>
                                </div>
                                <Input
                                    label="Quantity (Pins)"
                                    type="number"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
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
                                />
                                <Input
                                    label="Ref Commission"
                                    type="number"
                                    value={formData.referralCommission}
                                    onChange={e => setFormData({ ...formData, referralCommission: e.target.value })}
                                />
                            </div>

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
                                {editingPin ? 'Update Configuration' : 'Create Configuration'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
