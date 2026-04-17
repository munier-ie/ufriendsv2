import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Save from 'lucide-react/dist/esm/icons/save';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function UpgradePlanManagement() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // Will store the type being saved

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/upgrade/plans', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data.plans);
        } catch (error) {
            console.error('Failed to fetch upgrade plans', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = (index, field, value) => {
        const newPlans = [...plans];
        newPlans[index] = { ...newPlans[index], [field]: value };
        setPlans(newPlans);
    };

    const handleFeatureChange = (planIndex, featureIndex, value) => {
        const newPlans = [...plans];
        const newFeatures = [...newPlans[planIndex].features];
        newFeatures[featureIndex] = value;
        newPlans[planIndex].features = newFeatures;
        setPlans(newPlans);
    };

    const addFeature = (planIndex) => {
        const newPlans = [...plans];
        newPlans[planIndex].features.push('New Feature');
        setPlans(newPlans);
    };

    const removeFeature = (planIndex, featureIndex) => {
        const newPlans = [...plans];
        newPlans[planIndex].features.splice(featureIndex, 1);
        setPlans(newPlans);
    };

    const handleSave = async (plan) => {
        setSaving(plan.type);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/upgrade/plans/${plan.type}`, {
                name: plan.name,
                price: parseFloat(plan.price),
                referralCommission: parseFloat(plan.referralCommission || 0),
                features: plan.features,
                active: plan.active
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`${plan.name} updated successfully!`)
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.error || 'Failed to update plan')
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Upgrade Management</h1>
                <p className="text-gray-500">Manage fees and features for all account tiers (Regular, Agent, Vendor)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {plans.map((plan, index) => (
                    <div key={plan.type} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className={`px-6 py-4 flex justify-between items-center text-white ${
                            plan.type === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-800' :
                            plan.type === 2 ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 
                            'bg-gradient-to-r from-purple-600 to-pink-600'
                            }`}>
                            <div className="flex items-center space-x-3">
                                <Crown size={24} />
                                <h2 className="font-bold text-lg">{plan.name} Tier</h2>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-sm">Active:</label>
                                <input
                                    type="checkbox"
                                    checked={plan.active}
                                    onChange={(e) => handleUpdatePlan(index, 'active', e.target.checked)}
                                    className="w-4 h-4 rounded border-white/30 text-white focus:ring-offset-0 bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="p-6 space-y-6 flex-1">
                            <div className="grid grid-cols-1 gap-4">
                                <Input
                                    label="Tier Name"
                                    value={plan.name}
                                    onChange={(e) => handleUpdatePlan(index, 'name', e.target.value)}
                                    placeholder="e.g. Agent"
                                />
                                <Input
                                    label="Upgrade Fee (₦)"
                                    type="number"
                                    value={plan.price}
                                    onChange={(e) => handleUpdatePlan(index, 'price', e.target.value)}
                                    placeholder="1000"
                                />
                                <Input
                                    label="Referral Commission (₦)"
                                    type="number"
                                    value={plan.referralCommission || 0}
                                    onChange={(e) => handleUpdatePlan(index, 'referralCommission', e.target.value)}
                                    placeholder="200"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700">Display Features</h3>
                                    <button
                                        onClick={() => addFeature(index)}
                                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-bold"
                                    >
                                        <Plus size={16} /> Add Feature
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {plan.features.map((feature, fIndex) => (
                                        <div key={fIndex} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(index, fIndex, e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                            />
                                            <button
                                                onClick={() => removeFeature(index, fIndex)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
                            <Button
                                onClick={() => handleSave(plan)}
                                loading={saving === plan.type}
                                icon={Save}
                                className="w-full"
                            >
                                Save {plan.name} Settings
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
