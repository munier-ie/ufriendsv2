import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Button from '../../components/ui/Button';

export default function Upgrade() {
    const [user, setUser] = useState(null);
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchUser(), fetchTiers()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
        }
    };

    const fetchTiers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/upgrade-plans', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Add the default 'Regular' tier for display if not in DB
            const dbTiers = res.data.plans.map(plan => ({
                ...plan,
                color: plan.type === 2 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800',
                border: plan.type === 2 ? 'border-blue-200' : 'border-purple-200'
            }));

            const regularTier = {
                type: 1,
                name: 'Regular',
                price: 0,
                features: ['Basic Usage', 'Standard Support', 'Standard Prices'],
                color: 'bg-gray-100 text-gray-800',
                active: true
            };

            setTiers([regularTier, ...dbTiers]);
        } catch (error) {
            console.error('Failed to fetch tiers:', error);
        }
    };

    const handleUpgrade = async (targetType, typeName) => {
        if (!confirm(`Are you sure you want to upgrade to ${typeName}? The fee will be deducted from your wallet.`)) {
            return;
        }

        setUpgrading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/user/upgrade', { targetType }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setSuccess(res.data.message);
                fetchUser(); // Refresh user data
                // Update local storage user if it exists
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                storedUser.type = targetType;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }
        } catch (error) {
            setError(error.response?.data?.error || 'Upgrade failed');
        } finally {
            setUpgrading(false);
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
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mb-4">
                    <Crown size={32} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Upgrade Your Account</h1>
                <p className="text-gray-500 mt-2">Unlock exclusive features and cheaper prices</p>
                <div className="mt-4 inline-block px-4 py-2 bg-gray-100 rounded-full text-sm font-medium">
                    Current Balance: ₦{parseFloat(user?.balance || 0).toLocaleString()}
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center justify-center space-x-2"
                    >
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-green-50 text-green-600 p-4 rounded-xl flex items-center justify-center space-x-2"
                    >
                        <Check size={20} />
                        <span className="font-medium">{success}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiers.map((tier) => {
                    const isCurrent = user?.type === tier.type;
                    const isLower = user?.type > tier.type;
                    const canUpgrade = !isCurrent && !isLower;

                    return (
                        <motion.div
                            key={tier.type}
                            whileHover={canUpgrade ? { y: -5 } : {}}
                            className={`relative rounded-2xl p-6 border-2 transition-all ${isCurrent ? 'border-primary shadow-xl shadow-primary/10' :
                                tier.border || 'border-transparent bg-white shadow-lg'
                                }`}
                        >
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Current Plan
                                </div>
                            )}

                            <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${tier.color}`}>
                                <Crown size={24} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                            <div className="mt-2 mb-6">
                                <span className="text-3xl font-bold text-gray-900">
                                    {tier.price === 0 ? 'Free' : `₦${tier.price.toLocaleString()}`}
                                </span>
                                {tier.price > 0 && <span className="text-gray-500 text-sm"> / one-time</span>}
                            </div>

                            <ul className="space-y-3 mb-8">
                                {tier.features.map((feature, i) => (
                                    <li key={i} className="flex items-center space-x-3 text-sm text-gray-600">
                                        <Check size={16} className="text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => handleUpgrade(tier.type, tier.name)}
                                disabled={!canUpgrade || upgrading}
                                loading={upgrading && canUpgrade} // Only show loader on the active button
                                className={`w-full py-3 font-bold ${isCurrent ? 'bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100' :
                                    isLower ? 'bg-gray-50 text-gray-400 cursor-not-allowed hover:bg-gray-50' :
                                        tier.type === 3 ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' :
                                            'bg-primary hover:bg-primary/90'
                                    }`}
                            >
                                {isCurrent ? 'Active Plan' : isLower ? 'Unlocked' : `Upgrade to ${tier.name}`}
                            </Button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
