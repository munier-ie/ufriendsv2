import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { 
    Plus, Trash2, Save, Loader2, 
    CheckCircle, Check, Zap, Code, Layout, HelpCircle,
    ArrowUp, ArrowDown, DollarSign, Globe, Smartphone, Apple
} from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function ResellerPricingManagement() {
    // Features state
    const [features, setFeatures] = useState({
        vtu: [],
        printing: [],
        manual: []
    });
    
    // Pricing options state
    const [options, setOptions] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [savingFeatures, setSavingFeatures] = useState(false);

    const [newItems, setNewItems] = useState({
        vtu: '',
        printing: '',
        manual: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            
            const [settingsRes, optionsRes] = await Promise.all([
                axios.get('/api/admin/config/settings', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/software/options', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (settingsRes.data.settings?.resellerFeatures) {
                setFeatures(settingsRes.data.settings.resellerFeatures);
            } else {
                setFeatures({
                    vtu: ["Data Vending", "Airtime Top-up", "Electricity Bill Payment", "Airtime to Cash", "Exam PIN Vending", "Recharge Card Printing", "Data Card Vending"],
                    printing: ["Advanced NIN Slip Printing System", "Standard & Premium NIN Designs", "BVN Slip Generation Tool", "Secure PDF Export"],
                    manual: ["BVN Modification Service", "NIN Modification Service", "BVN Android License", "BVN Retrieval Service", "VNIN to NIBSS Validation", "NIN Validation Service"]
                });
            }
            
            setOptions(optionsRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load reseller configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFeatures = async () => {
        try {
            setSavingFeatures(true);
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/config/settings', {
                resellerFeatures: features
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Features updated successfully');
        } catch (error) {
            console.error('Failed to update features:', error);
            toast.error('Failed to update features');
        } finally {
            setSavingFeatures(false);
        }
    };

    const handleUpdatePrice = async (id, newPrice) => {
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

    const handleAddItem = (category) => {
        const text = newItems[category].trim();
        if (!text) return;

        setFeatures(prev => ({
            ...prev,
            [category]: [...prev[category], text]
        }));
        setNewItems(prev => ({ ...prev, [category]: '' }));
    };

    const handleRemoveItem = (category, index) => {
        setFeatures(prev => ({
            ...prev,
            [category]: prev[category].filter((_, i) => i !== index)
        }));
    };

    const handleEditItem = (category, index, newValue) => {
        setFeatures(prev => ({
            ...prev,
            [category]: prev[category].map((f, i) => i === index ? newValue : f)
        }));
    };

    const moveItem = (category, index, direction) => {
        const list = [...features[category]];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= list.length) return;
        
        const temp = list[index];
        list[index] = list[newIndex];
        list[newIndex] = temp;
        
        setFeatures(prev => ({
            ...prev,
            [category]: list
        }));
    };

    const renderPriceInput = (category, name, label) => {
        const opt = options.find(o => o.category === category && o.name === name);
        if (!opt) return null;

        return (
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₦</span>
                    <input 
                        type="number"
                        defaultValue={opt.price}
                        onBlur={(e) => {
                            if (parseFloat(e.target.value) !== opt.price) {
                                handleUpdatePrice(opt.id, e.target.value);
                            }
                        }}
                        className="w-full pl-7 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="font-bold text-slate-500">Loading Reseller Configuration...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="text-primary" /> Reseller Pricing & Features
                </h1>
                <p className="text-slate-500 text-sm">Manage prices for platforms, deployments, and the feature lists of bundles.</p>
            </div>

            {/* Part 1: Pricing Management */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign size={20} className="text-primary" /> Pricing Configuration
                </h2>
                
                {/* Platforms & Hosting */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Globe size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Web Platform</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('web', 'managed', 'Managed')}
                            {renderPriceInput('web', 'ownership', 'Ownership')}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Smartphone size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Android App</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('android', 'managed', 'Managed')}
                            {renderPriceInput('android', 'ownership', 'Ownership')}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Apple size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">iOS App</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('ios', 'managed', 'Managed')}
                            {renderPriceInput('ios', 'ownership', 'Ownership')}
                        </div>
                    </div>
                </div>

                {/* Store Deployments & Extras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900">Android Store</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('publishing_android', 'shared', 'Shared')}
                            {renderPriceInput('publishing_android', 'personal', 'Personal')}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900">iOS Store</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('publishing_ios', 'shared', 'Shared')}
                            {renderPriceInput('publishing_ios', 'personal', 'Personal')}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900">Service Extras</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {renderPriceInput('extra', 'printing', 'Printing Hub')}
                            {renderPriceInput('extra', 'manual', 'Manual Services')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Part 2: Feature Lists */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Zap size={20} className="text-primary" /> Bundles & Feature Lists
                    </h2>
                    <Button 
                        onClick={handleSaveFeatures} 
                        disabled={savingFeatures}
                        className="shadow-lg shadow-primary/20"
                    >
                        {savingFeatures ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                        Save Features
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Core VTU Package */}
                    <div className="group relative bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 border border-slate-800 flex flex-col">
                        <div className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">CORE SYSTEM</div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                                <Code size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-base">VTU Standard</h4>
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] mb-4 pr-2">
                            {features.vtu.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-[11px] leading-snug text-slate-300 font-medium bg-slate-800/50 p-2 rounded-lg group/item">
                                    <div className="flex items-center gap-2 flex-1">
                                        <CheckCircle size={12} className="text-primary shrink-0" />
                                        <input 
                                            type="text"
                                            value={f}
                                            onChange={(e) => handleEditItem('vtu', i, e.target.value)}
                                            className="bg-transparent border-none outline-none focus:ring-0 w-full text-slate-300 focus:text-white transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem('vtu', i, -1)} className="text-slate-500 hover:text-white p-1">
                                            <ArrowUp size={12} />
                                        </button>
                                        <button onClick={() => moveItem('vtu', i, 1)} className="text-slate-500 hover:text-white p-1">
                                            <ArrowDown size={12} />
                                        </button>
                                        <button onClick={() => handleRemoveItem('vtu', i)} className="text-slate-500 hover:text-red-400 p-1">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto flex gap-2">
                            <input 
                                type="text"
                                placeholder="Add feature..."
                                value={newItems.vtu}
                                onChange={(e) => setNewItems(prev => ({ ...prev, vtu: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('vtu')}
                                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                            <button onClick={() => handleAddItem('vtu')} className="bg-primary hover:bg-primary/90 text-white p-2 rounded-xl transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Printing Add-on */}
                    <div className="group rounded-3xl p-6 border-2 border-slate-100 bg-white hover:border-slate-200 transition-all flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                                <Layout size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-slate-900">Printing Hub</h4>
                                <p className="text-[10px] text-primary font-bold">Professional ID Suite</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] mb-4 pr-2">
                            {features.printing.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-[11px] leading-snug text-slate-600 font-medium bg-slate-50 p-2 rounded-lg group/item">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Check size={12} className="text-primary shrink-0" />
                                        <input 
                                            type="text"
                                            value={f}
                                            onChange={(e) => handleEditItem('printing', i, e.target.value)}
                                            className="bg-transparent border-none outline-none focus:ring-0 w-full text-slate-600 focus:text-slate-900 transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem('printing', i, -1)} className="text-slate-400 hover:text-slate-900 p-1">
                                            <ArrowUp size={12} />
                                        </button>
                                        <button onClick={() => moveItem('printing', i, 1)} className="text-slate-400 hover:text-slate-900 p-1">
                                            <ArrowDown size={12} />
                                        </button>
                                        <button onClick={() => handleRemoveItem('printing', i)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto flex gap-2">
                            <input 
                                type="text"
                                placeholder="Add feature..."
                                value={newItems.printing}
                                onChange={(e) => setNewItems(prev => ({ ...prev, printing: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('printing')}
                                className="flex-1 bg-slate-50 border border-slate-100 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                            <button onClick={() => handleAddItem('printing')} className="bg-primary hover:bg-primary/90 text-white p-2 rounded-xl transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Manual Add-on */}
                    <div className="group rounded-3xl p-6 border-2 border-slate-100 bg-white hover:border-slate-200 transition-all flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                                <HelpCircle size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-slate-900">Manual Services</h4>
                                <p className="text-[10px] text-primary font-bold">Admin Processing</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] mb-4 pr-2">
                            {features.manual.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-[11px] leading-snug text-slate-600 font-medium bg-slate-50 p-2 rounded-lg group/item">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Check size={12} className="text-primary shrink-0" />
                                        <input 
                                            type="text"
                                            value={f}
                                            onChange={(e) => handleEditItem('manual', i, e.target.value)}
                                            className="bg-transparent border-none outline-none focus:ring-0 w-full text-slate-600 focus:text-slate-900 transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem('manual', i, -1)} className="text-slate-400 hover:text-slate-900 p-1">
                                            <ArrowUp size={12} />
                                        </button>
                                        <button onClick={() => moveItem('manual', i, 1)} className="text-slate-400 hover:text-slate-900 p-1">
                                            <ArrowDown size={12} />
                                        </button>
                                        <button onClick={() => handleRemoveItem('manual', i)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto flex gap-2">
                            <input 
                                type="text"
                                placeholder="Add feature..."
                                value={newItems.manual}
                                onChange={(e) => setNewItems(prev => ({ ...prev, manual: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('manual')}
                                className="flex-1 bg-slate-50 border border-slate-100 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                            <button onClick={() => handleAddItem('manual')} className="bg-primary hover:bg-primary/90 text-white p-2 rounded-xl transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
