import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, History, Wallet, AlertCircle } from 'lucide-react';

export default function AirtimeToCash() {
    const [formData, setFormData] = useState({
        network: '',
        amount: '',
        phoneNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/airtime-cash/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const calculateReceiveAmount = (amt) => {
        return amt * 0.8; // 80% payout
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/airtime-cash/request',
                {
                    ...formData,
                    amount: parseFloat(formData.amount)
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage({ type: 'success', text: 'Request submitted successfully! awaiting admin approval.' });
            setFormData({ network: '', amount: '', phoneNumber: '' });
            fetchHistory();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                {/* Request Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Airtime to Cash</h2>
                            <p className="text-sm text-gray-500">Convert your airtime to wallet balance</p>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <AlertCircle size={20} />
                            <p>{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                            <select
                                required
                                value={formData.network}
                                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="">Select Network</option>
                                <option value="MTN">MTN (80%)</option>
                                <option value="AIRTEL">Airtel (80%)</option>
                                <option value="GLO">Glo (80%)</option>
                                <option value="9MOBILE">9Mobile (80%)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input
                                type="number"
                                required
                                min="100"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Minimum ₦100"
                            />
                            {formData.amount && (
                                <p className="text-sm text-gray-500 mt-1">
                                    You will receive: <span className="font-bold text-green-600">₦{calculateReceiveAmount(formData.amount).toLocaleString()}</span>
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number Sending From</label>
                            <input
                                type="tel"
                                required
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="080..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    Proceed <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
                            <li>Select your network and enter the amount you want to convert.</li>
                            <li>We charge a 20% convenience fee.</li>
                            <li>After submitting, you will receive instructions on where to transfer the airtime.</li>
                            <li>Wallet will be funded once transfer is verified.</li>
                        </ul>
                    </div>
                </div>

                {/* History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
                            <p className="text-sm text-gray-500">Your conversion history</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No requests yet.</p>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{item.network}</p>
                                            <p className="text-xs text-gray-500">{new Date(item.createAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${item.status === 1 ? 'bg-green-100 text-green-700' :
                                                item.status === 2 ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item.status === 1 ? 'Approved' : item.status === 2 ? 'Rejected' : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Sent: ₦{item.amount.toLocaleString()}</span>
                                        <span className="font-bold text-green-600">Receive: ₦{item.receiveAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
