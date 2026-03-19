import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, User, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Transfer() {
    const [step, setStep] = useState(1); // 1: Search, 2: Amount & PIN
    const [searchQuery, setSearchQuery] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        pin: ''
    });

    const [userBalance, setUserBalance] = useState(0);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserBalance(res.data.wallet);
        } catch (error) {
            console.error('Failed to fetch balance', error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;

        setLoading(true);
        setError('');
        setRecipient(null);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/transfer/recipient/${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecipient(res.data.recipient);
            setStep(2);
        } catch (error) {
            setError(error.response?.data?.error || 'Recipient not found');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/transfer', {
                recipient: searchQuery,
                amount: parseFloat(formData.amount),
                pin: formData.pin
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess(`Success! ₦${parseFloat(formData.amount).toLocaleString()} transferred to ${recipient.firstName}.`);
            setStep(3); // Success step
            fetchBalance(); // Refresh balance
        } catch (error) {
            setError(error.response?.data?.error || 'Transfer failed');
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setStep(1);
        setSearchQuery('');
        setRecipient(null);
        setFormData({ amount: '', pin: '' });
        setError('');
        setSuccess('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                    <Send size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Wallet Transfer</h1>
                <p className="text-gray-500 text-sm">Transfer funds instantly to any Ufriends user</p>
                <div className="inline-block bg-gray-100 px-4 py-1.5 rounded-full text-xs font-bold text-gray-600">
                    Wallet Balance: <span className="text-primary font-black ml-1">₦{userBalance.toLocaleString()}</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100"
                    >
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="space-y-4 text-center">
                                <p className="text-gray-600 font-medium">Who are you sending to?</p>
                                <div className="relative max-w-md mx-auto">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Search size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Phone Number or Email"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-lg font-medium"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="text-red-500 text-sm font-medium flex items-center justify-center gap-2">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                fullWidth
                                loading={loading}
                                className="py-4 text-lg font-bold"
                            >
                                Find User <ArrowRight size={20} className="ml-2" />
                            </Button>
                        </form>
                    </motion.div>
                )}

                {step === 2 && recipient && (
                    <motion.div
                        key="amount"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6"
                    >
                        {/* Recipient Info */}
                        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                                {recipient.firstName[0]}{recipient.lastName[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{recipient.firstName} {recipient.lastName}</h3>
                                <p className="text-sm text-gray-500">{recipient.phone}</p>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="ml-auto text-xs font-bold text-primary hover:underline"
                            >
                                Change
                            </button>
                        </div>

                        <form onSubmit={handleTransfer} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Amount (₦)"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    className="text-2xl font-bold"
                                />
                                <Input
                                    label="Transaction PIN"
                                    type="password"
                                    maxLength={4}
                                    placeholder="****"
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                    required
                                    className="text-2xl font-mono tracking-widest text-center"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                fullWidth
                                loading={submitting}
                                disabled={!formData.amount || !formData.pin || parseFloat(formData.amount) > userBalance}
                                className="py-4 text-lg font-bold bg-gradient-to-r from-primary to-secondary"
                            >
                                Confirm Transfer
                            </Button>
                        </form>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-12 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle size={48} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
                            <p className="text-gray-500 max-w-xs mx-auto">{success}</p>
                        </div>
                        <div className="pt-4 flex flex-col gap-3">
                            <Button onClick={reset} fullWidth>
                                Send More
                            </Button>
                            <Button variant="outline" fullWidth onClick={() => window.location.href = '/dashboard/transactions'}>
                                View History
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instruction Card */}
            {step !== 3 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                        <b>Information:</b> P2P Transfers are processed instantly and cannot be reversed once confirmed.
                        Please double-check the recipient's details (name and phone number) before proceeding.
                    </p>
                </div>
            )}
        </div>
    );
}
