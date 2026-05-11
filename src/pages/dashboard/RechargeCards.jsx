import React, { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function RechargeCards() {
    const [formData, setFormData] = useState({
        network: '',
        denomination: '',
        quantity: '1',
        name: '',
        pin: ''
    });
    const [loading, setLoading] = useState(false);
    const [generatedPins, setGeneratedPins] = useState([]);

    const networks = [
        { id: 'MTN', name: 'MTN' },
        { id: 'AIRTEL', name: 'Airtel' },
        { id: 'GLO', name: 'Glo' },
        { id: '9MOBILE', name: '9Mobile' }
    ];

    const denominations = [100, 200, 500, 1000];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setGeneratedPins([]);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/recharge-cards/purchase', {
                ...formData,
                denomination: parseInt(formData.denomination),
                quantity: parseInt(formData.quantity)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(res.data.message);
            setGeneratedPins(res.data.pins || []);
            setFormData({ ...formData, pin: '' }); // Clear PIN
        } catch (error) {
            toast.error(error.response?.data?.error || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Printer className="mr-2 text-primary" /> Recharge Card Printing
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Printer size={32} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Network</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary outline-none"
                                value={formData.network}
                                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                                required
                            >
                                <option value="">Select Network</option>
                                {networks.map((net) => (
                                    <option key={net.id} value={net.id}>{net.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Denomination</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary outline-none"
                                value={formData.denomination}
                                onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                                required
                            >
                                <option value="">Select Denomination</option>
                                {denominations.map((den) => (
                                    <option key={den} value={den}>₦{den}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />

                        <Input
                            label="Name on Card"
                            placeholder="Enter name to display on print"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <Input
                            label="Transaction PIN"
                            type="password"
                            maxLength="4"
                            placeholder="Your 4-digit PIN"
                            value={formData.pin}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                            required
                        />

                        <div className="pt-2">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <span className="text-gray-600 font-medium">Total Amount</span>
                                <span className="text-2xl font-bold text-gray-900">
                                    ₦{formData.denomination && formData.quantity ? (parseInt(formData.denomination) * parseInt(formData.quantity)).toLocaleString() : '0.00'}
                                </span>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-4 text-lg font-bold"
                            loading={loading}
                            disabled={!formData.network || !formData.denomination || !formData.name || !formData.pin}
                        >
                            Generate Pins
                        </Button>
                    </form>
                </div>

                {/* Pins Display Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-green-100 rounded-lg text-green-600">
                            <Printer size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Generated Pins</h2>
                            <p className="text-sm text-gray-500">Your purchased pins will appear here</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                        {generatedPins.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No pins generated yet.</p>
                        ) : (
                            generatedPins.map((item, index) => (
                                <div key={index} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-gradient-to-br from-white to-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{formData.network} ₦{formData.denomination}</p>
                                            <p className="text-xs text-gray-500">Name: {formData.name}</p>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">
                                            Success
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">PIN:</span>
                                            <span className="font-mono font-bold text-gray-900">{item.token}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Serial:</span>
                                            <span className="font-mono text-gray-500">{item.serial}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {generatedPins.length > 0 && (
                        <div className="mt-6">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => window.print()}
                            >
                                Print Pins
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
