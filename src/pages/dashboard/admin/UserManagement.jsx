import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Ban from 'lucide-react/dist/esm/icons/ban';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import X from 'lucide-react/dist/esm/icons/x';
import User from 'lucide-react/dist/esm/icons/user';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import History from 'lucide-react/dist/esm/icons/history';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null); // For detail view
    const [userDetail, setUserDetail] = useState(null); // Full detail from API
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // profile, wallet, kyc, transactions

    // Action states
    const [fundingAmount, setFundingAmount] = useState('');
    const [debitAmount, setDebitAmount] = useState('');
    const [debitDescription, setDebitDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add User State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', password: '', state: '', type: 1
    });

    // Edit Profile State
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timeout);
    }, [search]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`/api/admin/users?search=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetail = async (id) => {
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserDetail(res.data.user);
            setEditForm(res.data.user); // Init edit form
        } catch (error) {
            console.error('Failed to fetch user detail', error);
            alert('Failed to load user details');
            setSelectedUser(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setActiveTab('profile');
        fetchUserDetail(user.id);
    };

    const handleFundWallet = async (e) => {
        e.preventDefault();
        if (!fundingAmount) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/api/admin/users/${selectedUser.id}/fund`, { amount: fundingAmount }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Wallet funded successfully');
            setFundingAmount('');
            fetchUserDetail(selectedUser.id); // Refresh
            fetchUsers(); // Refresh list list wallet balance
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to fund wallet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDebitWallet = async (e) => {
        e.preventDefault();
        if (!debitAmount) return;
        if (!confirm(`Are you sure you want to debit ₦${debitAmount} from this user?`)) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/api/admin/users/${selectedUser.id}/debit`, { 
                amount: debitAmount,
                description: debitDescription
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Wallet debited successfully');
            setDebitAmount('');
            setDebitDescription('');
            fetchUserDetail(selectedUser.id);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to debit wallet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/users', addForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('User created successfully');
            setIsAddModalOpen(false);
            setAddForm({ firstName: '', lastName: '', email: '', phone: '', password: '', state: '', type: 1 });
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateProfile = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/users/${selectedUser.id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Profile updated successfully');
            fetchUserDetail(selectedUser.id);
            fetchUsers();
        } catch (error) {
            alert('Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!confirm(`Are you sure you want to ${newStatus === 1 ? 'block' : 'unblock'} this user?`)) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/users/${selectedUser.id}/status`, { regStatus: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUserDetail(selectedUser.id);
            fetchUsers();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <Button onClick={() => setIsAddModalOpen(true)} icon={Plus}>
                        Add User
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Balance</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {user.firstName?.[0] || user.username?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-gray-500">@{user.username || 'user'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">{user.email}</div>
                                            <div className="text-xs text-gray-500">{user.phone}</div>
                                            {user.bankNo && (
                                                <div className="text-[10px] mt-1 text-teal-600 bg-teal-50 inline-block px-1.5 py-0.5 rounded border border-teal-100">
                                                    {user.bankName}: <span className="font-mono">{user.bankNo}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₦{user.wallet?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.type === 2 ? 'bg-purple-100 text-purple-700' :
                                                user.type === 3 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.type === 2 ? 'Agent' : user.type === 3 ? 'Vendor' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.regStatus === 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {user.regStatus === 1 ? 'Blocked' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleSelectUser(user)}
                                                className="text-gray-400 hover:text-primary p-1"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold">User Details</h2>
                                <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            {detailLoading || !userDetail ? (
                                <div className="flex-1 flex justify-center items-center p-12"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
                                    {/* Sidebar Tabs */}
                                    <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-100">
                                        <div className="text-center mb-6">
                                            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-3xl font-bold text-primary mb-2">
                                                {userDetail.firstName?.[0]}
                                            </div>
                                            <h3 className="font-bold text-gray-900">{userDetail.firstName} {userDetail.lastName}</h3>
                                            <p className="text-sm text-gray-500">{userDetail.email}</p>
                                        </div>
                                        <nav className="space-y-1">
                                            {[
                                                { id: 'profile', label: 'Profile', icon: User },
                                                { id: 'wallet', label: 'Wallet & Funding', icon: Wallet },
                                                { id: 'kyc', label: 'KYC & Verification', icon: FileText },
                                                { id: 'transactions', label: 'Recent Activity', icon: History },
                                            ].map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveTab(item.id)}
                                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === item.id ? 'bg-white shadow text-primary' : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <item.icon size={18} className="mr-3" />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>

                                    {/* Content Area */}
                                    <div className="flex-1 p-6">
                                        {activeTab === 'profile' && (
                                            <div className="space-y-4 max-w-md">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input
                                                        label="First Name"
                                                        value={editForm.firstName || ''}
                                                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                                    />
                                                    <Input
                                                        label="Last Name"
                                                        value={editForm.lastName || ''}
                                                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                                    />
                                                </div>
                                                <Input
                                                    label="Email"
                                                    value={editForm.email || ''}
                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                />
                                                <Input
                                                    label="Phone"
                                                    value={editForm.phone || ''}
                                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                />
                                                {(userDetail.bankName || userDetail.bankNo) && (
                                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Virtual Account</label>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-sm text-gray-900">{userDetail.bankName || 'N/A'}</span>
                                                            <span className="text-sm font-mono font-medium text-gray-900">{userDetail.bankNo || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">User Type</label>
                                                        <select
                                                            className="w-full mt-1 p-2 border rounded-lg"
                                                            value={editForm.type}
                                                            onChange={e => setEditForm({ ...editForm, type: parseInt(e.target.value) })}
                                                        >
                                                            <option value={1}>User</option>
                                                            <option value={2}>Agent</option>
                                                            <option value={3}>Vendor</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => handleStatusUpdate(userDetail.regStatus === 1 ? 0 : 1)}
                                                                className={`px-3 py-1 rounded text-sm font-medium ${userDetail.regStatus === 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                                    }`}
                                                            >
                                                                {userDetail.regStatus === 1 ? 'Blocked (Click to unblock)' : 'Active (Click to block)'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button loading={submitting} onClick={handleUpdateProfile} className="mt-4">
                                                    Save Changes
                                                </Button>
                                            </div>
                                        )}

                                        {activeTab === 'wallet' && (
                                            <div className="space-y-6">
                                                <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                                                    <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                                                    <p className="text-3xl font-bold text-gray-900">₦{userDetail.wallet?.toLocaleString()}</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="max-w-md bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                        <h3 className="font-bold mb-3 text-green-700">Fund Wallet (Credit)</h3>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="Amount (₦)"
                                                                value={fundingAmount}
                                                                onChange={e => setFundingAmount(e.target.value)}
                                                                className="flex-1"
                                                            />
                                                            <Button onClick={handleFundWallet} loading={submitting} className="bg-green-600 hover:bg-green-700">Fund</Button>
                                                        </div>
                                                    </div>

                                                    <div className="max-w-md bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                        <h3 className="font-bold mb-3 text-red-700">Debit Wallet (Deduct)</h3>
                                                        <div className="space-y-3">
                                                            <Input
                                                                type="number"
                                                                placeholder="Amount (₦)"
                                                                value={debitAmount}
                                                                onChange={e => setDebitAmount(e.target.value)}
                                                            />
                                                            <Input
                                                                type="text"
                                                                placeholder="Reason / Description (optional)"
                                                                value={debitDescription}
                                                                onChange={e => setDebitDescription(e.target.value)}
                                                            />
                                                            <Button onClick={handleDebitWallet} loading={submitting} className="w-full bg-red-600 hover:bg-red-700 border-none">
                                                                Debit Account
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'kyc' && (
                                            <div className="space-y-4 max-w-md">
                                                <Input
                                                    label="NIN"
                                                    value={editForm.nin || ''}
                                                    onChange={e => setEditForm({ ...editForm, nin: e.target.value })}
                                                />
                                                <Input
                                                    label="BVN"
                                                    value={editForm.bvn || ''}
                                                    onChange={e => setEditForm({ ...editForm, bvn: e.target.value })}
                                                />
                                                <div className="flex items-center space-x-2 pt-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.kycStatus}
                                                        onChange={e => setEditForm({ ...editForm, kycStatus: e.target.checked })}
                                                        className="w-5 h-5"
                                                        id="kycToggle"
                                                    />
                                                    <label htmlFor="kycToggle" className="font-medium text-gray-700">KYC Verified Status</label>
                                                </div>
                                                <Button loading={submitting} onClick={handleUpdateProfile} className="mt-4">
                                                    Update KYC Info
                                                </Button>
                                            </div>
                                        )}

                                        {activeTab === 'transactions' && (
                                            <div>
                                                <h3 className="font-bold mb-4">Recent Transactions</h3>
                                                <div className="overflow-hidden border rounded-lg">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-2">Date</th>
                                                                <th className="px-4 py-2">Service</th>
                                                                <th className="px-4 py-2">Amount</th>
                                                                <th className="px-4 py-2">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {userDetail.transactions?.map(tx => (
                                                                <tr key={tx.id}>
                                                                    <td className="px-4 py-2 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                                                                    <td className="px-4 py-2">{tx.serviceName}</td>
                                                                    <td className={`px-4 py-2 font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${tx.status === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                                            }`}>
                                                                            {tx.status === 0 ? 'Success' : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {(!userDetail.transactions || userDetail.transactions.length === 0) && (
                                                                <tr><td colSpan="4" className="text-center py-4 text-gray-500">No transactions found</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Add New User</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="First Name" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} required />
                                <Input label="Last Name" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} required />
                            </div>
                            <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                            <Input label="Phone" type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} required />
                            <Input label="Password" type="text" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
                            <Input label="State" value={addForm.state} onChange={(e) => setAddForm({ ...addForm, state: e.target.value })} placeholder="e.g. Lagos" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                                    value={addForm.type}
                                    onChange={(e) => setAddForm({ ...addForm, type: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Subscriber</option>
                                    <option value={2}>Agent</option>
                                    <option value={3}>Vendor</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                                <Button variant="outline" onClick={() => setIsAddModalOpen(false)} type="button">Cancel</Button>
                                <Button type="submit" loading={submitting}>Create User</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
