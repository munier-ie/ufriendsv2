import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Loader2, Info, ArrowRight, Tag, ShieldCheck, Crown } from 'lucide-react';

export default function Pricing() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', label: 'All Services' },
        { id: 'airtime', label: 'Airtime' },
        { id: 'data', label: 'Data' },
        { id: 'cable', label: 'Cable TV' },
        { id: 'electricity', label: 'Electricity' },
        { id: 'exam', label: 'Exam PINs' },
        { id: 'data_pin', label: 'Data PINs' },
        { id: 'manual', label: 'Manual Services' },
        { id: 'gov', label: 'Gov Services' }
    ];

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/services/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(res.data.services);
        } catch (error) {
            console.error('Failed to fetch pricing:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.type.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'all' || s.type === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const formatPrice = (s, price) => {
        if (s.type === 'airtime_cash') return `${price}%`;
        if (price <= 0) return 'Variable';
        return `₦${price.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Service Pricing</h1>
                <p className="text-gray-500">Transparent rates across all our service tiers</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search network or service..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                        />
                    </div>
                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2 md:pb-0">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pricing Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Service</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={12} /> Regular
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-50/30">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={12} /> Agent
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-purple-600 uppercase tracking-widest bg-purple-50/30">
                                    <div className="flex items-center gap-2">
                                        <Crown size={12} /> Vendor
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredServices.length > 0 ? (
                                filteredServices.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{s.name}</span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{s.type.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-600">{formatPrice(s, s.price)}</span>
                                        </td>
                                        <td className="px-6 py-4 bg-blue-50/10">
                                            <span className="font-bold text-blue-600">
                                                {formatPrice(s, s.agentPrice || s.price)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 bg-purple-50/10">
                                            <span className="font-black text-purple-700">
                                                {formatPrice(s, s.vendorPrice || s.price)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                        No services found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center shrink-0">
                        <Info size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">Want cheaper rates?</h4>
                        <p className="text-gray-500 text-sm">Upgrade to Agent or Vendor tier to enjoy maximum discounts on all purchases.</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = '/dashboard/upgrade'}
                    className="px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-105 transition-transform flex items-center gap-2"
                >
                    Upgrade Now <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
