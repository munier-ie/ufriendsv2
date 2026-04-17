import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Zap from 'lucide-react/dist/esm/icons/zap';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function ElectricityDashboard() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [formData, setFormData] = useState({
        provider: '',
        charge: '',
        active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/electricity', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProviders(res.data.providers);
        } catch (error) {
            console.error('Failed to fetch providers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (prov) => {
        setEditingProvider(prov);
        setFormData({
            provider: prov.provider,
            charge: prov.charge,
            active: prov.active
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this provider?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/electricity/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProviders(providers.filter(p => p.id !== id));
        } catch (error) {
            toast.error('Failed to delete provider')
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                ...formData,
                charge: parseFloat(formData.charge)
            };

            if (editingProvider) {
                await axios.put(`/api/admin/electricity/${editingProvider.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Provider updated successfully')
            } else {
                await axios.post('/api/admin/electricity', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Provider created successfully')
            }
            setModalOpen(false);
            setEditingProvider(null);
            fetchProviders();
            setFormData({ provider: '', charge: '', active: true });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save provider')
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Zap className="w-6 h-6 mr-2 text-indigo-600" />
                    Electricity Providers
                </h1>
                <Button onClick={() => { setEditingProvider(null); setModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Provider
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
                                    <th className="px-6 py-3">Provider Name</th>
                                    <th className="px-6 py-3">Service Charge</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {providers.map(prov => (
                                    <tr key={prov.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{prov.provider}</td>
                                        <td className="px-6 py-4">₦{prov.charge}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${prov.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {prov.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(prov)} className="text-blue-600 hover:text-blue-800">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(prov.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingProvider ? 'Edit Provider' : 'New Provider'}</h2>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input label="Provider Name" value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} placeholder="e.g. IKEDC" required />
                            <Input label="Service Charge" type="number" value={formData.charge} onChange={e => setFormData({ ...formData, charge: e.target.value })} required />
                            <div className="flex items-center space-x-2 pt-2">
                                <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                                <label>Active</label>
                            </div>
                            <Button type="submit" className="w-full" loading={submitting}>{editingProvider ? 'Update' : 'Create'}</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
