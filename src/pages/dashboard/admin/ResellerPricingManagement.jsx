import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { 
    Plus, Trash2, Save, Globe, Smartphone, 
    Layers, Loader2, DollarSign, CheckCircle2 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function ResellerPricingManagement() {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New option state
    const [newItem, setNewItem] = useState({ category: 'Platform', name: '', price: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/software/options', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions(res.data);
        } catch (error) {
            toast.error('Failed to load reseller options');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name.trim() || !newItem.price) return;

        try {
            setSaving(true);
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/software/options', {
                ...newItem,
                price: parseFloat(newItem.price)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions([...options, res.data]);
            setNewItem({ ...newItem, name: '', price: '' });
            toast.success('Option added successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add option');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this option?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/software/options/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions(options.filter(opt => opt.id !== id));
            toast.success('Option deleted');
        } catch (error) {
            toast.error('Failed to delete option');
        }
    };

    const updatePrice = async (id, newPrice) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/software/options/${id}`, { price: parseFloat(newPrice) }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions(options.map(opt => opt.id === id ? { ...opt, price: parseFloat(newPrice) } : opt));
            toast.success('Price updated');
        } catch (error) {
            toast.error('Failed to update price');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="font-bold text-gray-500">Loading Reseller Pricing...</p>
            </div>
        );
    }

    const renderCategory = (category, icon, label) => {
        const filtered = options.filter(opt => opt.category === category);
        const Icon = icon;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Icon className="mr-2 text-primary" size={20} /> {label}
                </h2>

                <div className="space-y-3 flex-1">
                    {filtered.length === 0 && <p className="text-center text-gray-400 py-4 italic text-sm">No items added yet</p>}
                    {filtered.map(opt => (
                        <div key={opt.id} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:bg-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-900 font-bold text-sm">{opt.name}</span>
                                <button
                                    onClick={() => handleDeleteItem(opt.id)}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₦</span>
                                    <input 
                                        type="number"
                                        defaultValue={opt.price}
                                        onBlur={(e) => {
                                            if (parseFloat(e.target.value) !== opt.price) {
                                                updatePrice(opt.id, e.target.value);
                                            }
                                        }}
                                        className="w-full pl-7 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="text-primary" /> Reseller Pricing Management
                    </h1>
                    <p className="text-slate-500">Configure base costs for platforms, deployments, and add-on services</p>
                </div>
            </div>

            {/* Quick Add Form */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="text-primary" size={20} /> Add New Pricing Option
                </h2>
                <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                        <select 
                            value={newItem.category}
                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            <option value="Platform">Platform (Android/iOS/Web)</option>
                            <option value="Store">Store Deployment</option>
                            <option value="Addon">Service Add-on</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Option Name</label>
                        <input 
                            type="text"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            placeholder="e.g. Android App"
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Base Price (₦)</label>
                        <input 
                            type="number"
                            value={newItem.price}
                            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                            placeholder="50000"
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                    <Button type="submit" disabled={saving || !newItem.name || !newItem.price} className="h-[46px] shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="animate-spin" /> : 'Create Option'}
                    </Button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderCategory('Platform', Smartphone, 'Platforms')}
                {renderCategory('Store', Globe, 'Store Deployments')}
                {renderCategory('Addon', Layers, 'Service Add-ons')}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl">
                <div className="flex gap-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl h-fit">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900 mb-1">Pricing Security Note</h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            These prices are fetched and validated server-side during checkout. Modifying them here will immediately affect new Reseller requests. Existing requests will maintain their original payment references.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
