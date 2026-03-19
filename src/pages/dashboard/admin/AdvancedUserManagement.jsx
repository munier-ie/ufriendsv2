import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Search, Loader2, RefreshCw, Key, Lock, Trash2,
    CheckCircle, XCircle, AlertCircle, Eye, History
} from 'lucide-react';

export default function AdvancedUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [showTransactionsModal, setShowTransactionsModal] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [newType, setNewType] = useState(1);
    const [newPassword, setNewPassword] = useState('');
    const [apiKeyResult, setApiKeyResult] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [actions, setActions] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users || []);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeType = async () => {
        if (!selectedUser) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put(
                `/api/admin/users/${selectedUser.id}/type`,
                { type: newType },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(res.data.message);
            setShowTypeModal(false);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to change user type');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetApiKey = async (user) => {
        if (!confirm(`Reset API key for ${user.firstName} ${user.lastName}?`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post(
                `/api/admin/users/${user.id}/reset-api-key`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setApiKeyResult(res.data.apiKey);
            setSelectedUser(user);
            setShowApiKeyModal(true);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reset API key');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put(
                `/api/admin/users/${selectedUser.id}/password`,
                { newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(res.data.message);
            setShowPasswordModal(false);
            setNewPassword('');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`PERMANENTLY DELETE ${user.firstName} ${user.lastName}? This action cannot be undone!`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.delete(
                `/api/admin/users/${user.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(res.data.message);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    const viewTransactions = async (user) => {
        setSelectedUser(user);
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(
                `/api/admin/users/${user.id}/transactions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTransactions(res.data.transactions || []);
            setShowTransactionsModal(true);
        } catch (error) {
            alert('Failed to load transactions');
        } finally {
            setActionLoading(false);
        }
    };

    const viewActions = async (user) => {
        setSelectedUser(user);
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(
                `/api/admin/users/${user.id}/actions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setActions(res.data.actions || []);
            setShowActionsModal(true);
        } catch (error) {
            alert('Failed to load action history');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        `${user.firstName} ${user.lastName} ${user.email} ${user.phone}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getUserTypeBadge = (type) => {
        const styles = {
            1: 'bg-blue-100 text-blue-800',
            2: 'bg-green-100 text-green-800',
            3: 'bg-purple-100 text-purple-800',
            4: 'bg-orange-100 text-orange-800'
        };
        const labels = { 1: 'Subscriber', 2: 'Agent', 3: 'Vendor', 4: 'Referral' };
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[type]}`}>{labels[type]}</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Advanced User Management
                    </h1>
                    <p className="text-gray-600 mt-1">{filteredUsers.length} users found</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Wallet</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div>{user.email}</div>
                                            <div className="text-gray-500">{user.phone}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getUserTypeBadge(user.type)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-green-600">₦{user.wallet.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.regStatus === 0 ? (
                                            <span className="flex items-center text-green-600">
                                                <CheckCircle size={16} className="mr-1" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-red-600">
                                                <XCircle size={16} className="mr-1" /> Blocked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => { setSelectedUser(user); setNewType(user.type); setShowTypeModal(true); }}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="Change Type"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleResetApiKey(user)}
                                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                title="Reset API Key"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                                                className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                                title="Reset Password"
                                            >
                                                <Lock size={16} />
                                            </button>
                                            <button
                                                onClick={() => viewTransactions(user)}
                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                title="View Transactions"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => viewActions(user)}
                                                className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                                title="Action History"
                                            >
                                                <History size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Change Type Modal */}
            {showTypeModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Change User Type</h3>
                        <p className="text-gray-600 mb-6">
                            Change type for: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                        </p>
                        <select
                            value={newType}
                            onChange={(e) => setNewType(parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-6 focus:ring-2 focus:ring-primary"
                        >
                            <option value={1}>Subscriber</option>
                            <option value={2}>Agent</option>
                            <option value={3}>Vendor</option>
                            <option value={4}>Referral</option>
                        </select>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleChangeType}
                                disabled={actionLoading}
                                className="flex-1 bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Change Type'}
                            </button>
                            <button
                                onClick={() => setShowTypeModal(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Reset Password</h3>
                        <p className="text-gray-600 mb-6">
                            Reset password for: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                        </p>
                        <input
                            type="password"
                            placeholder="New password (min 6 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-6 focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={handleResetPassword}
                                disabled={actionLoading || newPassword.length < 6}
                                className="flex-1 bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Reset Password'}
                            </button>
                            <button
                                onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Result Modal */}
            {showApiKeyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                            <h3 className="text-2xl font-bold mb-4">New API Key Generated</h3>
                            <p className="text-gray-600 mb-2">User: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong></p>
                            <p className="text-sm text-red-600 mb-4">⚠️ Copy this key now. It won't be shown again!</p>
                            <div className="bg-gray-100 p-4 rounded-xl mb-6 break-all font-mono text-sm">
                                {apiKeyResult}
                            </div>
                            <button
                                onClick={() => { navigator.clipboard.writeText(apiKeyResult); alert('Copied!'); }}
                                className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors mb-2"
                            >
                                📋 Copy to Clipboard
                            </button>
                            <button
                                onClick={() => { setShowApiKeyModal(false); setApiKeyResult(''); }}
                                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions Modal */}
            {showTransactionsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Transaction History</h3>
                        <p className="text-gray-600 mb-6">User: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong></p>
                        <div className="space-y-2">
                            {transactions.map(tx => (
                                <div key={tx.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50">
                                    <div className="flex justify-between">
                                        <div>
                                            <div className="font-semibold">{tx.serviceName}</div>
                                            <div className="text-sm text-gray-600">{tx.description}</div>
                                            <div className="text-xs text-gray-400">{new Date(tx.date).toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg">₦{tx.amount.toLocaleString()}</div>
                                            <div className={`text-sm ${tx.status === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.status === 0 ? 'Success' : tx.status === 1 ? 'Pending' : 'Failed'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowTransactionsModal(false)}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors mt-6"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Action History Modal */}
            {showActionsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-auto shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Action History</h3>
                        <p className="text-gray-600 mb-6">User: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong></p>
                        <div className="space-y-3">
                            {actions.map(action => (
                                <div key={action.id} className="border-l-4 border-primary bg-gray-50 p-4 rounded-r-xl">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-primary">{action.action.replace('_', ' ')}</div>
                                            <div className="text-sm text-gray-600 mt-1">{action.details}</div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                By: <strong>{action.admin.name}</strong> ({action.admin.username})
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 text-right">
                                            {new Date(action.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowActionsModal(false)}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors mt-6"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
