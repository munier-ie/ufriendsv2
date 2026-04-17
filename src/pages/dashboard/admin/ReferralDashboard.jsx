import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Users from 'lucide-react/dist/esm/icons/users';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import Search from 'lucide-react/dist/esm/icons/search';

export default function ReferralDashboard() {
    const [referrers, setReferrers] = useState([]);
    const [stats, setStats] = useState({ totalCommissionPaid: 0, totalReferrals: 0 });
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const headers = { Authorization: `Bearer ${token}` };

            const [listRes, statsRes, leadRes] = await Promise.all([
                axios.get('/api/admin/referrals', { headers }),
                axios.get('/api/admin/referrals/stats', { headers }),
                axios.get('/api/admin/referrals/leaderboard', { headers })
            ]);

            setReferrers(listRes.data.referrers);
            setStats(statsRes.data);
            setLeaderboard(leadRes.data.leaderboard);
        } catch (error) {
            console.error('Failed to fetch referral data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`/api/admin/referrals?search=${searchTerm}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReferrers(res.data.referrers);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Referral Management</h1>
                <p className="text-gray-500">Monitor referral performance and payouts</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Referrals</p>
                        <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Commission Paid</p>
                        <p className="text-2xl font-bold">₦{stats.totalCommissionPaid.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Top Referrer</p>
                        <p className="text-xl font-bold truncate max-w-[150px]">{leaderboard[0]?.username || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800">Referrer List</h2>
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search user..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </form>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">Code</th>
                                    <th className="px-6 py-3 text-center">Ref Count</th>
                                    <th className="px-6 py-3 text-right">Wallet Bal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {referrers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{user.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-700">{user.email}</p>
                                            <p className="text-xs text-gray-400">{user.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-500">{user.referralCode}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">
                                                {user.totalReferred}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">₦{user.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {referrers.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No data found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-800 flex items-center">
                            <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                            Top 10 Leaderboard
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {leaderboard.map((user, index) => (
                            <div key={user.username} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-gray-100 text-gray-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-700">{user.username}</span>
                                </div>
                                <span className="font-bold text-gray-900">{user.count} Refs</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
