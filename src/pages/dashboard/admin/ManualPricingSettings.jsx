import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Save from 'lucide-react/dist/esm/icons/save';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ManualPricingSettings() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/manual-services/prices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrices(res.data.prices || []);
        } catch (error) {
            console.error('Failed to fetch prices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (id, field, value) => {
        setPrices(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSave = async (price) => {
        setSavingId(price.id);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/manual-services/prices/${price.id}`, {
                userPrice: price.userPrice,
                agentPrice: price.agentPrice,
                vendorPrice: price.vendorPrice,
                basePrice: price.basePrice,
                referralCommission: price.referralCommission,
                active: price.active
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Price updated successfully!')
        } catch (error) {
            console.error('Save error:', error.response?.data || error);
            toast.error(error.response?.data?.error || 'Failed to save price')
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    const grouped = prices.reduce((acc, p) => {
        if (!acc[p.serviceType]) acc[p.serviceType] = [];
        acc[p.serviceType].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Manual Service Pricing</h1>
                <p className="text-gray-500">Manage granular pricing for BVN and NIN manual service variants</p>
            </div>

            {Object.entries(grouped).map(([serviceType, items]) => (
                <div key={serviceType} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 tracking-tight">
                            {serviceType.replace(/_/g, ' ')}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {items.map(price => (
                            <div key={price.id} className="p-6 transition-colors hover:bg-gray-50/50">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    <div className="lg:w-1/4">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900">
                                                {price.subType ? price.subType.replace(/_/g, ' ').toUpperCase() : 'BASE PRICE'}
                                            </p>
                                            <input
                                                type="checkbox"
                                                checked={price.active}
                                                onChange={e => handleUpdate(price.id, 'active', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                            {price.serviceType}
                                        </p>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Input
                                            label="User Price"
                                            type="number"
                                            value={price.userPrice}
                                            onChange={e => handleUpdate(price.id, 'userPrice', parseFloat(e.target.value))}
                                            placeholder="2000"
                                        />
                                        <Input
                                            label="Agent Price"
                                            type="number"
                                            value={price.agentPrice}
                                            onChange={e => handleUpdate(price.id, 'agentPrice', parseFloat(e.target.value))}
                                            placeholder="1800"
                                        />
                                        <Input
                                            label="Vendor Price"
                                            type="number"
                                            value={price.vendorPrice}
                                            onChange={e => handleUpdate(price.id, 'vendorPrice', parseFloat(e.target.value))}
                                            placeholder="1500"
                                        />
                                        <Input
                                            label="Base Price (Cost)"
                                            type="number"
                                            value={price.basePrice}
                                            onChange={e => handleUpdate(price.id, 'basePrice', parseFloat(e.target.value))}
                                            placeholder="1000"
                                            className="border-red-200"
                                        />
                                         <Input
                                             label="Ref Commission"
                                             type="number"
                                             value={price.referralCommission}
                                             onChange={e => handleUpdate(price.id, "referralCommission", parseFloat(e.target.value))}
                                             placeholder="0"
                                         />
                                    </div>

                                    <div className="lg:w-24 flex items-end">
                                        <Button
                                            onClick={() => handleSave(price)}
                                            loading={savingId === price.id}
                                            className="w-full"
                                            icon={Save}
                                            size="sm"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Pricing Logic Info</p>
                    <p>The system first looks for a price matching the specific variant selected by the user. If not found, it falls back to the <strong>BASE PRICE</strong> of that service category. "Active" status here determines visibility in the user services menu.</p>
                </div>
            </div>
        </div>
    );
}
