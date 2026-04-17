import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ProviderManagement() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingProvider, setEditingProvider] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', baseUrl: '', apiKey: '', apiToken: '', username: '', active: true });

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/providers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProviders(res.data);
        } catch (error) {
            console.error('Failed to fetch providers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (isAdding) {
                await axios.post('/api/admin/providers', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.put(`/api/admin/providers/${editingProvider.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsAdding(false);
            setEditingProvider(null);
            fetchProviders();
        } catch (error) {
            toast.error('Operation failed')
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (provider) => {
        setEditingProvider(provider);
        setFormData({
            name: provider.name,
            baseUrl: provider.baseUrl || '',
            apiKey: provider.apiKey || '',
            apiToken: provider.apiToken || '',
            username: provider.username || '',
            active: provider.active
        });
        setIsAdding(false);
    };

    const handleAdd = () => {
        setFormData({ name: '', baseUrl: '', apiKey: '', apiToken: '', username: '', active: true });
        setIsAdding(true);
        setEditingProvider(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">API Provider Management</h1>
                <Button onClick={handleAdd} className="flex items-center space-x-2">
                    <Plus size={18} />
                    <span>Add Provider</span>
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {providers.map(provider => (
                        <motion.div
                            key={provider.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{provider.name}</h3>
                                    <p className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{provider.baseUrl || 'No base URL'}</p>
                                </div>
                                <div className={`p-1.5 rounded-full ${provider.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {provider.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="text-sm">
                                    <span className="text-gray-400 block mb-1">API Key</span>
                                    <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded block truncate italic text-gray-600">
                                        {provider.apiKey ? "********" : "Not Set"}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-400 block mb-1">API Token</span>
                                    <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded block truncate italic text-gray-600">
                                        {provider.apiToken ? "********" : "Not Set"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-4">
                                <span className={`text-xs font-bold uppercase tracking-wider ${provider.active ? 'text-green-600' : 'text-red-500'}`}>
                                    {provider.active ? 'Active' : 'Maintenance'}
                                </span>
                                <button
                                    onClick={() => handleEdit(provider)}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary transition-colors"
                                >
                                    <Edit3 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {(isAdding || editingProvider) && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-xl font-bold mb-6">{isAdding ? 'Add API Provider' : `Edit ${editingProvider.name}`}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Provider Name"
                                    placeholder="e.g. Monnify, PaymentPoint"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Base URL"
                                    placeholder="https://api.vendor.com/v1"
                                    value={formData.baseUrl}
                                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                                />
                                <Input
                                    label="API Key"
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                                />
                                <Input
                                    label="Username (Required for Subandgain)"
                                    placeholder="e.g. YourSubandgainUsername"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                                <Input
                                    label="API Token (Optional depending on provider)"
                                    type="password"
                                    value={formData.apiToken}
                                    onChange={e => setFormData({ ...formData, apiToken: e.target.value })}
                                />

                                <div className="flex items-center space-x-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="provider-active"
                                        checked={formData.active}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="provider-status" className="text-sm font-medium text-gray-700">Provider is Active</label>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingProvider(null); }} className="flex-1">Cancel</Button>
                                    <Button type="submit" loading={submitting} className="flex-1">{isAdding ? 'Create' : 'Save Changes'}</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
