import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

export default function SmileData() {
    const [formData, setFormData] = useState({
        accountNumber: '',
        phoneNumber: '',
        planId: '',
        amount: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Mock Plans - In real app, fetch from API
    const smilePlans = [
        { id: '1', name: '500MB SmileVoice', price: 500 },
        { id: '2', name: '1GB Bigga', price: 1000 },
        { id: '3', name: '2GB Bigga', price: 2000 },
        { id: '4', name: '5GB Bigga', price: 5000 },
        { id: '5', name: '10GB Jumbo', price: 7500 },
        { id: '6', name: '20GB Jumbo', price: 10000 },
        { id: '7', name: 'Unlimited Lite', price: 15000 },
        { id: '8', name: 'Unlimited Premium', price: 20000 },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/services/purchase', {
                serviceId: formData.planId,
                recipient: formData.accountNumber, // Smile account number is usage identifier
                amount: parseFloat(formData.amount),
                phoneNumber: formData.phoneNumber, // Contact phone
                type: 'smile'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: res.data.message });
            setFormData({ accountNumber: '', phoneNumber: '', planId: '', amount: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Transaction failed' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Wifi className="mr-2 text-primary" /> Smile Voice & Data
            </h1>

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-pink-600 text-xl">smile</span>
                    </div>
                </div>

                <AnimatePresence>
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-red-50 text-red-700 border border-red-100'
                                }`}
                        >
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span className="font-medium">{message.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        label="Smile Account Number"
                        placeholder="Enter 10-digit Smile ID"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        required
                    />

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Select Plan</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary outline-none"
                            value={formData.planId}
                            onChange={(e) => {
                                const plan = smilePlans.find(p => p.id === e.target.value);
                                setFormData({
                                    ...formData,
                                    planId: e.target.value,
                                    amount: plan ? plan.price : ''
                                });
                            }}
                            required
                        >
                            <option value="">Select a bundle</option>
                            {smilePlans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name} - ₦{plan.price.toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Contact Phone Number"
                        placeholder="080..."
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        required
                    />

                    <div className="pt-2">
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <span className="text-gray-600 font-medium">Amount to Pay</span>
                            <span className="text-2xl font-bold text-gray-900">
                                ₦{formData.amount ? parseFloat(formData.amount).toLocaleString() : '0.00'}
                            </span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-4 text-lg font-bold"
                        loading={submitting}
                        disabled={!formData.planId || !formData.accountNumber}
                    >
                        Purchase Bundle
                    </Button>
                </form>
            </div>
        </div>
    );
}
