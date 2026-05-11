import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, History as HistoryIcon, Wallet, AlertCircle } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function AirtimeToCash() {
    const [formData, setFormData] = useState({
        network: '',
        amount: '',
        phoneNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [transferPin, setTransferPin] = useState('');
    const [sitePin, setSitePin] = useState('');
    const [sessionId, setSessionId] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/airtime-cash/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data.history || response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const calculateReceiveAmount = (amt) => {
        return amt * 0.8; // 80% payout
    };

    const handleGenerateOTP = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/airtime-cash/generate-otp',
                { network: formData.network, phoneNumber: formData.phoneNumber },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('OTP sent successfully!');
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/airtime-cash/verify-otp',
                { network: formData.network, phoneNumber: formData.phoneNumber, otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('OTP verified!');
            setSessionId(response.data.data.sessionId);
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/airtime-cash/request',
                {
                    ...formData,
                    amount: parseFloat(formData.amount),
                    pin: sitePin,
                    transferPin,
                    sessionId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Conversion successful! Wallet credited.');
            setFormData({ network: '', amount: '', phoneNumber: '' });
            setOtp('');
            setTransferPin('');
            setSitePin('');
            setSessionId('');
            setStep(1);
            fetchHistory();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Wallet className="mr-2 text-primary" /> Airtime2cash
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Form */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                            <Wallet size={32} />
                        </div>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                        {step === 1 && (
                            <>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Network</label>
                                    <select
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-primary outline-none"
                                        value={formData.network}
                                        onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Network</option>
                                        <option value="MTN">MTN (80%)</option>
                                        <option value="AIRTEL">Airtel (80%)</option>
                                        <option value="GLO">Glo (80%)</option>
                                        <option value="9MOBILE">9Mobile (80%)</option>
                                    </select>
                                </div>

                                <Input
                                    label="Amount"
                                    type="number"
                                    required
                                    min="100"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="Minimum ₦100"
                                />

                                <Input
                                    label="Phone Number Sending From"
                                    type="tel"
                                    required
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="080..."
                                />

                                {formData.amount && (
                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <span className="text-gray-600 font-medium">You Receive</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            ₦{calculateReceiveAmount(parseFloat(formData.amount)).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    className="w-full py-4 text-lg font-bold"
                                    onClick={handleGenerateOTP}
                                    loading={loading}
                                    disabled={loading || !formData.network || !formData.amount || !formData.phoneNumber}
                                >
                                    Proceed <ArrowRight size={18} className="ml-2 inline" />
                                </Button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Input
                                    label="Enter OTP"
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP sent to your phone"
                                />

                                <Button
                                    type="button"
                                    className="w-full py-4 text-lg font-bold"
                                    onClick={handleVerifyOTP}
                                    loading={loading}
                                    disabled={loading || !otp}
                                >
                                    Verify OTP
                                </Button>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Input
                                    label="Airtime Transfer PIN"
                                    type="password"
                                    required
                                    maxLength="4"
                                    value={transferPin}
                                    onChange={(e) => setTransferPin(e.target.value)}
                                    placeholder="4-digit SIM transfer PIN"
                                />

                                <Input
                                    label="Transaction PIN (Site)"
                                    type="password"
                                    required
                                    maxLength="4"
                                    value={sitePin}
                                    onChange={(e) => setSitePin(e.target.value)}
                                    placeholder="Your 4-digit site PIN"
                                />

                                <Button
                                    type="button"
                                    className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={loading || !transferPin || !sitePin}
                                >
                                    Complete Conversion
                                </Button>
                            </>
                        )}
                    </form>

                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
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
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <HistoryIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
                            <p className="text-sm text-gray-500">Your conversion history</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No requests yet.</p>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{item.network}</p>
                                            <p className="text-xs text-gray-500">{new Date(item.createAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${item.status === 1 ? 'bg-green-100 text-green-700' :
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
            </div>
        </div>
    );
}
