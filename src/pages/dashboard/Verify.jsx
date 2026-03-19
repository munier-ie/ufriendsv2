import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Fingerprint from 'lucide-react/dist/esm/icons/fingerprint';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Bank from 'lucide-react/dist/esm/icons/landmark';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Verify() {
    const [submitting, setSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState(null);
    const [virtualAccounts, setVirtualAccounts] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        type: 'nin',
        number: ''
    });

    useEffect(() => {
        fetchKycStatus();
    }, []);

    const fetchKycStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setKycStatus(res.data.kycStatus);
                setVirtualAccounts(res.data.virtualAccounts);
            }
        } catch (error) {
            console.error('Failed to fetch KYC status:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const endpoint = formData.type === 'nin' ? '/api/kyc/verify-nin' : '/api/kyc/verify-bvn';

            const res = await axios.post(endpoint, {
                [formData.type]: formData.number
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setKycStatus('verified');
                setVirtualAccounts(res.data.virtualAccounts);
                // Refresh to show accounts
                fetchKycStatus();
            }
        } catch (error) {
            setError(error.response?.data?.error || 'Verification failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    if (kycStatus === 'verified') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 text-green-600 mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">KYC Verified</h1>
                    <p className="text-gray-500 mt-2">Your identity has been verified successfully</p>
                </div>

                {/* Virtual Accounts Display */}
                {virtualAccounts && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900">Your Virtual Accounts</h2>

                        {/* Primary Account */}
                        {virtualAccounts.primary && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white shadow-xl"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs opacity-70 mb-1">Primary Account</p>
                                        <h3 className="text-xl font-bold">{virtualAccounts.primary.bankName}</h3>
                                    </div>
                                    <Bank className="opacity-20" size={40} />
                                </div>

                                <div className="bg-white/10 rounded-xl p-4 mb-3">
                                    <p className="text-xs opacity-70 mb-1">Account Number</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-2xl font-mono font-bold tracking-wider">{virtualAccounts.primary.accountNumber}</p>
                                        <button
                                            onClick={() => copyToClipboard(virtualAccounts.primary.accountNumber)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm opacity-90">{virtualAccounts.primary.accountName}</p>
                            </motion.div>
                        )}

                        {/* Secondary Accounts */}
                        {virtualAccounts.secondary && virtualAccounts.secondary.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-600">Additional Accounts</p>
                                {virtualAccounts.secondary.map((account, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-xl p-4 shadow-lg border border-gray-100"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{account.bank}</p>
                                                <p className="text-lg font-mono font-bold text-gray-700 mt-1">{account.accountNumber}</p>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(account.accountNumber)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Copy size={20} className="text-gray-600" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                    <ShieldCheck size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
                <p className="text-gray-500 mt-2">Verify your NIN or BVN to unlock Monnify virtual accounts</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Document Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'nin', number: '' })}
                                className={`flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition-all ${formData.type === 'nin'
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                <Fingerprint size={20} />
                                <span className="font-medium">NIN</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'bvn', number: '' })}
                                className={`flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition-all ${formData.type === 'bvn'
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                <UserCheck size={20} />
                                <span className="font-medium">BVN</span>
                            </button>
                        </div>
                    </div>

                    <Input
                        label={formData.type.toUpperCase() + " Number"}
                        placeholder={`Enter 11-digit ${formData.type.toUpperCase()}`}
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        required
                        maxLength={11}
                        className="text-lg tracking-widest"
                    />

                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex items-start space-x-2">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <div>
                            <p className="font-medium mb-1">After verification, you'll receive:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Wema Bank virtual account</li>
                                <li>Monie Point virtual account</li>
                                <li>Sterling Bank virtual account</li>
                                <li>Additional bank accounts (Fidelity, GTBank)</li>
                            </ul>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25"
                        loading={submitting}
                    >
                        Verify & Get Virtual Accounts
                    </Button>
                </form>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center justify-center space-x-2"
                        >
                            <AlertCircle size={20} />
                            <span className="font-medium">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
