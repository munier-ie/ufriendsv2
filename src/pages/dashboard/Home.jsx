import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import User from 'lucide-react/dist/esm/icons/user';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Plus from 'lucide-react/dist/esm/icons/plus';
import History from 'lucide-react/dist/esm/icons/history';
import Activity from 'lucide-react/dist/esm/icons/activity';
import X from 'lucide-react/dist/esm/icons/x';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Send from 'lucide-react/dist/esm/icons/send';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Copy from 'lucide-react/dist/esm/icons/copy';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import FileEdit from 'lucide-react/dist/esm/icons/file-edit';
import FileCheck from 'lucide-react/dist/esm/icons/file-check';
import FileCode from 'lucide-react/dist/esm/icons/file-code';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import ServiceIcon from '../../components/dashboard/ServiceIcon';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
    const [walletData, setWalletData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);
    const [showNetworkStatus, setShowNetworkStatus] = useState(false);
    const [statistics, setStatistics] = useState({
        totalTransactions: 0,
        weeklySpent: 0,
        monthlySpent: 0,
        totalSpent: 0,
        totalFunding: 0,
        cashback: 0,
        chartData: []
    });
    const [copied, setCopied] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [walletRes, transRes, statsRes] = await Promise.all([
                axios.get('/api/wallet/balance', { headers }),
                axios.get('/api/wallet/transactions?limit=5', { headers }),
                axios.get('/api/wallet/stats', { headers })
            ]);

            setWalletData(walletRes.data || { wallet: 0, refWallet: 0, total: 0 });
            setTransactions(transRes.data?.transactions || []);

            if (statsRes.data) {
                setStatistics({
                    totalTransactions: statsRes.data.totalTransactions || 0,
                    weeklySpent: statsRes.data.weeklySpent || 0,
                    monthlySpent: statsRes.data.monthlySpent || 0,
                    totalSpent: statsRes.data.totalSpent || 0,
                    totalFunding: statsRes.data.totalFunding || 0,
                    cashback: statsRes.data.cashback || 0,
                    chartData: statsRes.data.chartData || []
                });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBalanceVisibility = () => {
        setShowBalance(!showBalance);
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Wallet Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl shadow-2xl"
                style={{
                    backgroundImage: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)',
                }}
            >
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 p-8">
                        <Wallet size={150} className="text-white" />
                    </div>
                </div>

                <div className="relative z-10 p-5 sm:p-8">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div>
                            <p className="text-white/80 text-sm font-medium mb-1 sm:mb-2">Wallet Balance</p>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                                <h2 className="text-white text-2xl sm:text-4xl font-bold">
                                    {showBalance ? `₦${walletData?.wallet?.toLocaleString() || '0.00'}` : '₦ *****'}
                                </h2>
                                <button
                                    onClick={toggleBalanceVisibility}
                                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {showBalance ? (
                                        <Eye size={20} className="text-white" />
                                    ) : (
                                        <EyeOff size={20} className="text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                            <Wallet size={24} className="text-white sm:hidden" />
                            <Wallet size={32} className="text-white hidden sm:block" />
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-6">
                        <Link
                            to="/dashboard/virtual-accounts"
                            className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all border-2 border-white/30 text-sm sm:text-base"
                        >
                            <Plus size={16} className="sm:hidden" />
                            <Plus size={20} className="hidden sm:block" />
                            <span>Add Money</span>
                        </Link>
                        <Link
                            to="/dashboard/transactions"
                            className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all border-2 border-white/30 text-sm sm:text-base"
                        >
                            <History size={16} className="sm:hidden" />
                            <History size={20} className="hidden sm:block" />
                            <span>History</span>
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Secondary Wallet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -5 }}
                    className="bg-gradient-to-br from-secondary to-cyan-400 rounded-2xl p-6 text-white shadow-xl shadow-secondary/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <User size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium opacity-90 bg-white/10 px-3 py-1 rounded-full">Referral Wallet</span>
                        </div>
                        <h3 className="text-3xl font-bold">₦{walletData?.refWallet?.toLocaleString() || '0.00'}</h3>
                        <p className="text-xs opacity-70 mt-2">Commission Earnings</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl h-full flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold">
                                {walletData?.bankName || 'Palmpay'}
                            </h3>
                            <p className="text-xs mt-1 opacity-70">
                                via PaymentPoint
                            </p>
                        </div>
                        <Landmark className="opacity-20" size={40} />
                    </div>

                    {walletData?.bankNo ? (
                        <>
                            <div className="rounded-xl p-4 mb-3 bg-white/10">
                                <p className="text-xs mb-1 opacity-70">
                                    Account Number
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className="text-2xl font-mono font-bold tracking-wider">
                                        {walletData.bankNo}
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(walletData.bankNo, walletData.bankNo)}
                                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                                    >
                                        {copied === walletData.bankNo ? (
                                            <CheckCircle size={20} />
                                        ) : (
                                            <Copy size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm font-medium opacity-90">
                                {walletData?.accountName}
                            </p>
                        </>
                    ) : (
                        <div className="rounded-xl p-4 mb-3 bg-white/10 flex flex-col justify-center h-full">
                            <p className="text-sm font-medium mb-2">No virtual account found</p>
                            <Link to="/dashboard/virtual-accounts" className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg inline-block font-semibold w-max hover:bg-white/90">
                                Create Account
                            </Link>
                        </div>
                    )}

                    <p className="text-sm opacity-90">
                        Primary Funding Account
                    </p>
                </motion.div>
            </div>

            {/* Spending & Funding Analytics */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100"
            >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Spending Overview</h3>
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex items-center space-x-1.5 text-xs font-medium text-gray-500">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary"></span>
                            <span>Spent</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs font-medium text-gray-500">
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-400"></span>
                            <span>Funded</span>
                        </div>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statistics.chartData}>
                            <defs>
                                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorFunded" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickFormatter={(value) => `₦${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value) => [`₦${value.toLocaleString()}`]}
                            />
                            <Area
                                type="monotone"
                                dataKey="spent"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorSpent)"
                            />
                            <Area
                                type="monotone"
                                dataKey="funded"
                                stroke="#22d3ee"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorFunded)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Service Grid with Circular Icons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-3xl shadow-lg p-6"
            >
                <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Services</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-x-2 gap-y-6">
                    <Link to="/dashboard/services?type=airtime" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Airtime</span>
                    </Link>

                    <Link to="/dashboard/services?type=data" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Data</span>
                    </Link>

                    <Link to="/dashboard/services?type=cable" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Cable TV</span>
                    </Link>

                    <Link to="/dashboard/services?type=electricity" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Electricity</span>
                    </Link>

                    <Link to="/dashboard/services?type=data_pin" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Data Pin</span>
                    </Link>

                    <Link to="/dashboard/services?type=exam" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/exam-pin.jpg" alt="Exam Pin" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Exam Pin</span>
                    </Link>

                    <Link to="/dashboard/airtime-cash" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/airtime-to-cash.jpg" alt="Air Swap" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Air Swap</span>
                    </Link>

                    <Link to="/dashboard/gov-services" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/coat-of-arm.png" alt="Gov Services" className="w-full h-full object-contain p-2" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Gov Services</span>
                    </Link>

                    <Link to="/dashboard/gov-services?tab=bvn" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/bvn-slip.jpg" alt="BVN Slip" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">BVN Slip</span>
                    </Link>

                    <Link to="/dashboard/gov-services?tab=nin" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/ninIcon.png" alt="NIN Slip" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">NIN Slip</span>
                    </Link>

                    <Link to="/dashboard/manual-services?tab=BVN_ANDROID" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/1777058348703(1).png" alt="BVN Android Licence" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">BVN Android Licence</span>
                    </Link>

                    <Link to="/dashboard/manual-services" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/bvn-services.jpg" alt="BVN Services" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">BVN Services</span>
                    </Link>

                    <Link to="/dashboard/manual-services" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/nimc-services.jpg" alt="NIN Services" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">NIN Services</span>
                    </Link>

                    <Link to="/dashboard/banking-finance" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg overflow-hidden border border-gray-100">
                            <img src="/assets/nin/pos.jpg" alt="POS & Loan" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">POS & Loan</span>
                    </Link>

                    <Link to="/dashboard/academy" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Academy</span>
                    </Link>

                    <Link to="/dashboard/verify" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">KYC</span>
                    </Link>

                    <Link to="/dashboard/upgrade" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Account</span>
                    </Link>

                    <Link to="/dashboard/referrals" className="flex flex-col items-center group">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Referrals</span>
                    </Link>
                </div>
            </motion.div>

            {/* Statistics Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-3xl shadow-lg overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Your Statistics</h3>
                        <button
                            onClick={() => setShowNetworkStatus(true)}
                            className="flex items-center space-x-1.5 text-sm text-primary hover:text-secondary transition-colors"
                        >
                            <Activity size={16} />
                            <span>Network Status</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-primary to-secondary text-white">
                                    <th className="text-left py-3 px-4 font-semibold">Statistics</th>
                                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Total Transactions</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-gray-900">{statistics.totalTransactions}</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Amount Spent This Week</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-orange-600">₦{statistics.weeklySpent.toLocaleString()}</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Amount Spent This Month</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-blue-600">₦{statistics.monthlySpent.toLocaleString()}</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Total Spent</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-red-600">₦{statistics.totalSpent.toLocaleString()}</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Total Funding</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-green-600">₦{statistics.totalFunding.toLocaleString()}</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="font-medium text-gray-700">Cashback Bonus</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-purple-600">₦{statistics.cashback.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View All
                    </button>
                </div>

                <div className="space-y-4">
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <ServiceIcon serviceName={tx.serviceName} />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{tx.serviceName}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-xs">{tx.description}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className={`font-bold text-sm sm:text-base ${tx.status === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                        ₦{Math.abs(tx.amount).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Network Status Modal */}
            <AnimatePresence>
                {showNetworkStatus && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNetworkStatus(false)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-w-2xl mx-auto"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">Data Network Status</h3>
                                    <button
                                        onClick={() => setShowNetworkStatus(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X size={24} className="text-gray-600" />
                                    </button>
                                </div>

                                {/* Network Status Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* MTN */}
                                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-4 text-white shadow-lg">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-lg mb-1">MTN</h4>
                                            <div className="text-3xl font-bold mb-1">100%</div>
                                            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Stable</span>
                                        </div>
                                    </div>

                                    {/* Airtel */}
                                    <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-4 text-white shadow-lg">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-lg mb-1">Airtel</h4>
                                            <div className="text-3xl font-bold mb-1">85%</div>
                                            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Stable</span>
                                        </div>
                                    </div>

                                    {/* Glo */}
                                    <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow-lg">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-lg mb-1">Glo</h4>
                                            <div className="text-3xl font-bold mb-1">50%</div>
                                            <span className="text-sm bg-yellow-500/80 px-3 py-1 rounded-full">Fair</span>
                                        </div>
                                    </div>

                                    {/* 9Mobile */}
                                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-lg mb-1">9Mobile</h4>
                                            <div className="text-3xl font-bold mb-1">40%</div>
                                            <span className="text-sm bg-yellow-500/80 px-3 py-1 rounded-full">Fair</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Text */}
                                <p className="text-xs text-gray-500 text-center mt-4">
                                    Network status is updated in real-time. Percentages indicate service availability.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
