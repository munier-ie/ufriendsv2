import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Bank from 'lucide-react/dist/esm/icons/landmark';
import Copy from 'lucide-react/dist/esm/icons/copy';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Button from '../../components/ui/Button';

export default function VirtualAccounts() {
    const [accounts, setAccounts] = useState(null);
    const [kycStatus, setKycStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/virtual-accounts/my-accounts', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setAccounts(res.data.accounts);
                setKycStatus(res.data.kycStatus);
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
            setError('Failed to load virtual accounts');
        } finally {
            setLoading(false);
        }
    };

    const createPaymentPointAccount = async () => {
        setCreating(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/virtual-accounts/create-paymentpoint', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                // Refresh accounts
                await fetchAccounts();
            }
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create account');
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                    <Bank size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Virtual Accounts</h1>
                <p className="text-gray-500 mt-2">Fund your wallet via bank transfer</p>
            </div>

            {/* Create PaymentPoint Account (if doesn't exist) */}
            {accounts && accounts.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100"
                >
                    <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <CreditCard className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Get Instant Virtual Account</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create a PaymentPoint virtual account instantly. No KYC required!
                            </p>
                            <Button
                                onClick={createPaymentPointAccount}
                                loading={creating}
                                className="bg-primary hover:bg-primary/90"
                            >
                                Create Account Now
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Display Existing Accounts */}
            {accounts && accounts.length > 0 && (
                <div className="space-y-4">
                    {accounts.map((account, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={account.isPrimary
                                ? "bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white shadow-xl"
                                : "bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                            }
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    {account.isPrimary && <p className="text-xs opacity-70 mb-1">Primary Account</p>}
                                    <h3 className={`text-xl font-bold ${account.isPrimary ? '' : 'text-gray-900'}`}>
                                        {account.bankName}
                                    </h3>
                                    <p className={`text-xs mt-1 ${account.isPrimary ? 'opacity-70' : 'text-gray-500'}`}>
                                        via {account.provider}
                                    </p>
                                </div>
                                <Bank className={account.isPrimary ? "opacity-20" : "text-gray-300"} size={40} />
                            </div>

                            <div className={`rounded-xl p-4 mb-3 ${account.isPrimary ? 'bg-white/10' : 'bg-gray-50'}`}>
                                <p className={`text-xs mb-1 ${account.isPrimary ? 'opacity-70' : 'text-gray-500'}`}>
                                    Account Number
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className={`text-2xl font-mono font-bold tracking-wider ${account.isPrimary ? '' : 'text-gray-900'}`}>
                                        {account.accountNumber}
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(account.accountNumber, account.accountNumber)}
                                        className={`p-2 rounded-lg transition-colors ${account.isPrimary ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                                    >
                                        {copied === account.accountNumber ? (
                                            <CheckCircle size={20} />
                                        ) : (
                                            <Copy size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className={`text-sm ${account.isPrimary ? 'opacity-90' : 'text-gray-700 font-medium'}`}>
                                {account.accountName}
                            </p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* KYC Reminder for Monnify accounts */}
            {kycStatus !== 'verified' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-50 border border-yellow-100 rounded-xl p-4"
                >
                    <div className="flex items-start space-x-3">
                        <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-yellow-900 mb-1">Unlock More Accounts</p>
                            <p className="text-sm text-yellow-700 mb-3">
                                Complete KYC verification to get Monnify virtual accounts with multiple banks
                                (Wema, Monie Point, Sterling, Fidelity, GTBank)
                            </p>
                            <Button
                                onClick={() => window.location.href = '/dashboard/verify'}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                            >
                                Verify Now
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-2"
                    >
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">💡 How to Fund</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Transfer any amount to your virtual account number</li>
                    <li>Your wallet will be credited automatically</li>
                    <li>No fees, instant confirmation</li>
                </ol>
            </div>
        </div>
    );
}
