import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left';
import History from 'lucide-react/dist/esm/icons/history';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Phone from 'lucide-react/dist/esm/icons/phone';

export default function SellPin() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        network: '',
        amount: '',
        userPhone: '',
        pin: ''
    });
    const [rates, setRates] = useState([]);
    const [receivingNumber, setReceivingNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/airtime-cash/rates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setRates(res.data.rates);
                setReceivingNumber(res.data.receivingNumber);
            }
        } catch (error) {
            console.error('Fetch rates error:', error);
            toast.error('Failed to load current rates' );
        } finally {
            setLoading(false);
        }
    };

    const selectedNetwork = rates.find(r => r.network === formData.network);
    const receiveAmount = formData.amount ? (parseFloat(formData.amount) * (selectedNetwork?.rate || 0) / 100) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/airtime-cash/request', {
                network: formData.network,
                amount: parseFloat(formData.amount),
                phoneNumber: formData.userPhone,
                pin: formData.pin
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success(res.data.message );
                setStep(3); // Success step
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Request failed' );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    <ArrowRightLeft className="mr-2 text-primary" /> Air Swap / Sell Airtime
                </div>
                <Link to="/dashboard/transactions" className="text-xs text-primary font-medium flex items-center hover:underline">
                    <History className="w-4 h-4 mr-1" /> History
                </Link>
            </h1>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-lg font-bold mb-2">Select Network</h2>
                            <p className="text-gray-500 text-sm">Choose the network you want to sell</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {rates.map(net => (
                                <button
                                    key={net.network}
                                    onClick={() => {
                                        setFormData({ ...formData, network: net.network });
                                        setStep(2);
                                    }}
                                    disabled={!net.active}
                                    className={`p-4 rounded-xl border transition-all text-center ${net.active
                                        ? 'border-gray-200 hover:border-primary hover:bg-primary/5'
                                        : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="font-bold text-gray-800">{net.network}</div>
                                    <div className="text-sm text-green-600 font-medium">{net.rate}% Rate</div>
                                    {!net.active && <div className="text-xs text-red-500">Unavailable</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex items-center justify-between mb-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-gray-500 hover:text-gray-800 flex items-center"
                            >
                                ← Back
                            </button>
                            <span className="font-bold text-primary">{formData.network}</span>
                        </div>

                        <div className="bg-blue-50 p-5 rounded-2xl mb-4 border border-blue-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">Transfer {formData.network} Airtime To:</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xl font-bold text-blue-900">{selectedNetwork?.phoneNumber || receivingNumber || 'Contact Admin'}</span>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(selectedNetwork?.phoneNumber || receivingNumber)}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Copy
                                    </button>
                                </div>

                                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-blue-200">
                                    <p className="text-[11px] font-bold text-blue-700 mb-1">How to transfer:</p>
                                    <p className="text-xs font-mono text-blue-900 break-all">
                                        {formData.network === 'MTN' && `*321*${selectedNetwork?.phoneNumber || receivingNumber}*${formData.amount || 'Amount'}*PIN#`}
                                        {formData.network === 'AIRTEL' && `SMS '2U ${selectedNetwork?.phoneNumber || receivingNumber} ${formData.amount || 'Amount'} PIN' to 432`}
                                        {formData.network === 'GLO' && `*131*${selectedNetwork?.phoneNumber || receivingNumber}*${formData.amount || 'Amount'}*PIN#`}
                                        {formData.network === '9MOBILE' && `*223*PIN*${formData.amount || 'Amount'}*${selectedNetwork?.phoneNumber || receivingNumber}#`}
                                    </p>
                                    <p className="text-[9px] text-blue-500 mt-1">* Replace 'PIN' with your network transfer PIN.</p>
                                </div>
                            </div>
                            <Phone className="absolute -right-4 -bottom-4 text-blue-100 w-24 h-24 rotate-12" />
                        </div>

                        <Input
                            label="Amount Sent (₦)"
                            type="number"
                            placeholder="e.g. 1000"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />

                        <Input
                            label="Sender Phone Number"
                            placeholder="The number you sent from"
                            type="tel"
                            value={formData.userPhone}
                            onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                            required
                        />

                        <Input
                            label="Transaction PIN"
                            type="password"
                            maxLength={4}
                            placeholder="4-digit PIN"
                            value={formData.pin}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                            required
                        />

                        <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Rate:</span>
                                <span className="font-medium">{selectedNetwork?.rate}%</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-gray-700 font-medium">You Receive:</span>
                                <span className="font-bold text-xl text-green-600">₦{receiveAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <AnimatePresence>
                            {message.text && message.type === 'error' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-red-600 bg-red-50 p-3 rounded-xl text-sm flex items-center"
                                >
                                    <AlertCircle size={16} className="mr-2 shrink-0" />
                                    {message.text}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            type="submit"
                            className="w-full py-4 font-bold text-lg rounded-xl shadow-lg shadow-primary/20"
                            loading={submitting}
                            disabled={!formData.amount || !formData.userPhone || formData.pin.length < 4}
                        >
                            Submit Transaction
                        </Button>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center py-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12 }}
                            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <CheckCircle size={48} className="text-green-600" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
                        <p className="text-gray-600 mb-8 px-4">Your airtime swap request is pending verification. Your wallet will be credited automatically once confirmed.</p>
                        <Button
                            onClick={() => {
                                setStep(1);
                                setFormData({ network: '', amount: '', userPhone: '', pin: '' });
                                }}
                            className="w-full py-3 rounded-xl"
                        >
                            Done
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
