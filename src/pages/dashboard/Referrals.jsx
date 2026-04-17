import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import Users from 'lucide-react/dist/esm/icons/users';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Button from '../../components/ui/Button';

export default function Referrals() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [tcOpen, setTcOpen] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/referrals/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch referral stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const code = stats?.referralCode;
        if (!code) {
            setMessage({ type: 'error', text: 'Referral code not available yet' });
            return;
        }

        const link = `${window.location.origin}/register?referral=${code}`;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(err => {
                    console.error('Clipboard error:', err);
                    fallbackCopyTextToClipboard(link);
                });
        } else {
            fallbackCopyTextToClipboard(link);
        }
    };

    const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setWithdrawLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/referrals/withdraw',
                { amount: withdrawAmount || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.message || 'Commission withdrawn to wallet!');
            setWithdrawAmount('');
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Withdrawal failed');
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
                    <p className="text-gray-500">Earn commissions by inviting friends</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Referrals</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.referralCount || 0}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Commission Balance</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">₦{parseFloat(stats?.commissionBalance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <Wallet size={24} />
                    </div>
                </div>
            </div>

            {/* Referral Link & Withdraw */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Link Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Your Referral Link</h3>
                    <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 truncate font-mono">
                            {`${window.location.origin}/register?referral=${stats?.referralCode}`}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl flex items-center transition-colors"
                        >
                            {copied ? <CheckCheck size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                        Share this link with your friends. When they register and upgrade or make purchases, you earn a commission!
                    </p>
                </div>

                {/* Withdraw Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Withdraw Commission</h3>

                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount to Withdraw</label>
                            <input
                                type="number"
                                placeholder="Leave empty to withdraw all"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            fullWidth
                            disabled={withdrawLoading || stats?.commissionBalance <= 0}
                            loading={withdrawLoading}
                        >
                            Withdraw to Wallet
                        </Button>
                    </form>
                </div>
            </div>

            {/* Commission Rates & Recent History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Commission Rates */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Commission Rates</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Account Upgrade', amount: '₦500' },
                            { label: 'Airtime Purchase', amount: '₦5' },
                            { label: 'Data Purchase', amount: '₦10' },
                            { label: 'Cable TV Subscription', amount: '₦20' },
                            { label: 'Electricity Bill', amount: '₦30' },
                            { label: 'Exam PIN', amount: '₦20' },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <span className="text-gray-600 text-sm">{item.label}</span>
                                <span className="font-bold text-gray-900">{item.amount}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent History */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Earnings</h3>
                    {stats?.recentBonus?.length > 0 ? (
                        <div className="space-y-4">
                            {stats.recentBonus.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                            <ArrowRight size={14} className="transform rotate-45" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                                            <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600">+₦{tx.amount}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No recent referral activity
                        </div>
                    )}
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setTcOpen(!tcOpen)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-lg font-bold text-gray-900">Referral Terms &amp; Conditions</span>
                    </div>
                    <motion.div animate={{ rotate: tcOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </button>
                <AnimatePresence>
                    {tcOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="px-6 pb-6 border-t border-gray-100 space-y-4 text-sm text-gray-600">
                                <div className="pt-4 space-y-3">
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                                        <p><strong className="text-gray-800">Eligibility:</strong> The referral program is open to all registered and verified Ufriends users. You must maintain an active account to earn and withdraw commissions.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                                        <p><strong className="text-gray-800">How It Works:</strong> Share your unique referral link. When someone registers using your link and completes a qualifying transaction, you earn a commission based on the transaction type.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                                        <p><strong className="text-gray-800">Minimum Withdrawal:</strong> The minimum commission withdrawal amount is <strong>₦100</strong>. Commissions below this threshold will remain in your referral wallet until the minimum is reached.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                                        <p><strong className="text-gray-800">Payout:</strong> Commissions are credited to your referral wallet instantly after a qualifying transaction by your referred user. You can withdraw accumulated commissions to your main wallet at any time.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">5</span>
                                        <p><strong className="text-gray-800">Self-Referral Prohibition:</strong> Creating multiple accounts to refer yourself, or using your own referral link in any way, is strictly prohibited and will result in account suspension and commission forfeiture.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">6</span>
                                        <p><strong className="text-gray-800">Fraud Prevention:</strong> Ufriends reserves the right to investigate and cancel referral commissions suspected of being obtained through fraudulent, misleading, or abusive means.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">7</span>
                                        <p><strong className="text-gray-800">Program Changes:</strong> Ufriends reserves the right to modify, suspend, or terminate the referral program at any time. Commission rates may be updated with reasonable notice to active users.</p>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-50 rounded-xl text-blue-700 text-xs">
                                        By participating in the referral program, you agree to these terms. For any disputes, please contact support.
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
