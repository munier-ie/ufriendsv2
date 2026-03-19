import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Shield from 'lucide-react/dist/esm/icons/shield';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function SystemUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '', username: '', password: '', role: 2, pinToken: '', status: 1
    });
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchUsers();
        // Get current user role
        const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
        setCurrentUser(user);
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/system-users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users);
        } catch (error) {
            console.error('Failed to fetch system users', error);
            if (error.response?.status === 403) {
                // Not authorized
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            const payload = { ...formData };
            if (!payload.password) delete payload.password; // Don't send empty password on update

            if (editingUser) {
                const res = await axios.put(`/api/admin/system-users/${editingUser.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(users.map(u => u.id === editingUser.id ? res.data.user : u));
                alert('User updated successfully');
            } else {
                const res = await axios.post('/api/admin/system-users', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers([res.data.user, ...users]);
                alert('User created successfully');
            }
            closeModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this admin user?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/api/admin/system-users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put(`/api/admin/system-users/${user.id}/toggle-status`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setUsers(users.map(u => u.id === user.id ? { ...u, status: res.data.status } : u));
        } catch (error) {
            alert('Failed to toggle status');
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            username: user.username,
            password: '', // Empty for security
            role: user.role,
            pinToken: '',
            status: user.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ name: '', username: '', password: '', role: 2, pinToken: '', status: 1 });
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    if (currentUser && currentUser.role !== 1) { // Assuming 1 is Super Admin
        return (
            <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                <p className="text-gray-500">Only Super Administrators can manage system users.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Users</h1>
                    <p className="text-gray-500">Manage administrator accounts and permissions</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                    Create Admin
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{user.name}</td>
                                    <td className="px-6 py-4">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 1 ? 'bg-purple-100 text-purple-700' :
                                                user.role === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {user.role === 1 ? 'Super Admin' : user.role === 2 ? 'Admin' : 'Support'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleStatus(user)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {user.status === 1 ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 p-1">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {user.id !== currentUser?.id && (
                                            <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingUser ? 'Edit Admin' : 'Create New Admin'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={editingUser ? "Leave empty to keep current" : "Required"}
                                required={!editingUser}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Super Admin</option>
                                    <option value={2}>Admin</option>
                                    <option value={3}>Support</option>
                                </select>
                            </div>

                            <Input
                                label="PIN (4 digits)"
                                maxLength={4}
                                value={formData.pinToken}
                                onChange={(e) => setFormData({ ...formData, pinToken: e.target.value })}
                                placeholder="Optional"
                            />

                            <div className="flex justify-end space-x-3 mt-6">
                                <Button variant="outline" onClick={closeModal} type="button">Cancel</Button>
                                <Button type="submit" loading={submitting}>
                                    {editingUser ? 'Update User' : 'Create User'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
