import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Key from 'lucide-react/dist/esm/icons/key';
import Lock from 'lucide-react/dist/esm/icons/lock';
import History from 'lucide-react/dist/esm/icons/history';
import User from 'lucide-react/dist/esm/icons/user';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useNavigate } from 'react-router-dom';

export default function AdminProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('security');

    // Forms
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '', enable: false });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const [profRes, actRes] = await Promise.all([
                axios.get('/api/admin/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/auth/activity', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setProfile(profRes.data.admin);
            setActivities(actRes.data.actions);
            setPinForm(prev => ({ ...prev, enable: profRes.data.admin.pinStatus === 1 }));
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return alert('New passwords do not match');
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/auth/update-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Password updated successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update password');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePinUpdate = async (e) => {
        e.preventDefault();
        if (pinForm.pin !== pinForm.confirmPin) {
            return alert('PINs do not match');
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/auth/update-pin', {
                pin: pinForm.pin,
                enable: pinForm.enable
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('PIN setting updated successfully');
            fetchProfile(); // refresh status
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update PIN');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('adminToken');
            navigate('/admin/login');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" size={40} /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center h-fit">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-4xl font-bold text-primary mb-4">
                        {profile?.name?.[0]}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
                    <p className="text-gray-500">@{profile?.username}</p>
                    <div className="mt-4 inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {profile?.role === 1 ? 'Super Admin' : 'Admin'}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Member since {new Date(profile?.createdAt).toLocaleDateString()}</p>

                    <button
                        onClick={handleLogout}
                        className="mt-6 w-full flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                    >
                        <LogOut size={16} className="mr-2" /> Log Out
                    </button>
                </div>

                {/* Settings & Activity */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex border-b border-gray-100">
                            {[
                                { id: 'security', label: 'Security Settings', icon: Shield },
                                { id: 'activity', label: 'Recent Activity', icon: History },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 px-4 py-3 flex items-center justify-center text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <tab.icon size={16} className="mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {activeTab === 'security' && (
                                <div className="space-y-8">
                                    <form onSubmit={handlePasswordUpdate}>
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Key size={18} className="mr-2" /> Change Password</h3>
                                        <div className="space-y-4">
                                            <Input
                                                type="password" label="Current Password"
                                                value={passwordForm.currentPassword}
                                                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    type="password" label="New Password"
                                                    value={passwordForm.newPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                />
                                                <Input
                                                    type="password" label="Confirm Password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                />
                                            </div>
                                            <Button loading={submitting} type="submit">Update Password</Button>
                                        </div>
                                    </form>

                                    <div className="h-px bg-gray-100" />

                                    <form onSubmit={handlePinUpdate}>
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Lock size={18} className="mr-2" /> Transaction PIN</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <input
                                                    type="checkbox"
                                                    id="pinEnable"
                                                    checked={pinForm.enable}
                                                    onChange={e => setPinForm({ ...pinForm, enable: e.target.checked })}
                                                    className="w-4 h-4 text-primary rounded"
                                                />
                                                <label htmlFor="pinEnable" className="text-gray-700 font-medium">Enable PIN for critical actions</label>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    type="password" label="New PIN (4 digits)"
                                                    maxLength={4}
                                                    value={pinForm.pin}
                                                    onChange={e => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })}
                                                />
                                                <Input
                                                    type="password" label="Confirm PIN"
                                                    maxLength={4}
                                                    value={pinForm.confirmPin}
                                                    onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                                                />
                                            </div>
                                            <Button loading={submitting} type="submit">Update PIN Settings</Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-900 mb-2">Actions performed on users</h3>
                                    <div className="space-y-3">
                                        {activities.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">No recent activity</p>
                                        ) : (
                                            activities.map(act => (
                                                <div key={act.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                                                    <div className="mr-3 mt-1 bg-blue-100 p-1.5 rounded-full text-blue-600">
                                                        <History size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {act.action} <span className="text-gray-500">on user</span> {act.user?.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                                                        {act.details && (
                                                            <p className="text-xs text-gray-400 mt-1 font-mono">{act.details}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
