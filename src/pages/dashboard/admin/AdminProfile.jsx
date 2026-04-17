import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Key from 'lucide-react/dist/esm/icons/key';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import History from 'lucide-react/dist/esm/icons/history';
import User from 'lucide-react/dist/esm/icons/user';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Mail from 'lucide-react/dist/esm/icons/mail';
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

    // 2FA state
    const [twoFaStep, setTwoFaStep] = useState('initial'); // 'initial', 'choose', 'setup_totp', 'setup_email'
    const [twoFaMethod, setTwoFaMethod] = useState('totp');
    const [twoFaQrCode, setTwoFaQrCode] = useState('');
    const [twoFaToken, setTwoFaToken] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [disableTwoFaCode, setDisableTwoFaCode] = useState('');

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
            return toast.error('New passwords do not match')
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/auth/update-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Password updated successfully')
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update password')
        } finally {
            setSubmitting(false);
        }
    };

    const handlePinUpdate = async (e) => {
        e.preventDefault();
        if (pinForm.pin !== pinForm.confirmPin) {
            return toast.error('PINs do not match')
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/auth/update-pin', {
                pin: pinForm.pin,
                enable: pinForm.enable
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('PIN setting updated successfully')
            fetchProfile(); // refresh status
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update PIN')
        } finally {
            setSubmitting(false);
        }
    };

    const handleTwoFaSetup = async (method = 'totp') => {
        try {
            const token = localStorage.getItem('adminToken');
            if (method === 'totp') {
                const response = await axios.post('/api/admin/auth/setup-2fa', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTwoFaQrCode(response.data.qrCode);
                setTwoFaToken(response.data.tempToken);
                setTwoFaStep('setup_totp');
                setTwoFaMethod('totp');
            } else {
                await axios.post('/api/admin/auth/setup-email-2fa', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTwoFaStep('setup_email');
                setTwoFaMethod('email');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to initialize 2FA setup')
        }
    };

    const handleTwoFaEnable = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const endpoint = twoFaMethod === 'totp' ? '/api/admin/auth/enable-2fa' : '/api/admin/auth/enable-email-2fa';
            await axios.post(endpoint, {
                tempToken: twoFaMethod === 'totp' ? twoFaToken : undefined,
                code: twoFaCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('2FA enabled successfully!')
            fetchProfile();
            setTwoFaStep('initial');
            setTwoFaCode('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to verify and enable 2FA')
        }
    };

    const handleTwoFaDisable = async () => {
        if (!confirm('Are you certain you want to disable Two-Factor Authentication?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/auth/disable-2fa', { code: disableTwoFaCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('2FA disabled successfully')
            fetchProfile();
            setDisableTwoFaCode('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to disable 2FA')
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

                                    <div className="h-px bg-gray-100" />

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Smartphone size={18} className="mr-2" /> Two-Factor Authentication</h3>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                                            <span className="font-medium text-gray-700">2FA Status</span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile?.twoFaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {profile?.twoFaEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>

                                        {!profile?.twoFaEnabled ? (
                                            <div className="space-y-4">
                                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <p className="text-sm text-blue-800">
                                                        Enable two-factor authentication to protect your administrative account.
                                                    </p>
                                                </div>
                                                {twoFaStep === 'initial' && (
                                                    <Button onClick={() => setTwoFaStep('choose')} className="w-full">
                                                        Setup 2FA
                                                    </Button>
                                                )}
                                                {twoFaStep === 'choose' && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button
                                                            onClick={() => handleTwoFaSetup('totp')}
                                                            className="p-4 border-2 border-gray-100 rounded-xl hover:border-primary transition-colors text-center bg-white"
                                                        >
                                                            <Smartphone className="w-8 h-8 mx-auto mb-2 text-primary" />
                                                            <span className="block font-medium text-gray-900">Authenticator</span>
                                                            <span className="text-xs text-gray-500">Google Auth / Authy</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleTwoFaSetup('email')}
                                                            className="p-4 border-2 border-gray-100 rounded-xl hover:border-primary transition-colors text-center bg-white"
                                                        >
                                                            <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                                                            <span className="block font-medium text-gray-900">Email OTP</span>
                                                            <span className="text-xs text-gray-500">Verify via email</span>
                                                        </button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => setTwoFaStep('initial')}
                                                            className="col-span-2"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                )}
                                                {twoFaStep === 'setup_totp' && (
                                                    <div className="space-y-4 bg-white p-4 border border-gray-100 rounded-xl">
                                                        <p className="text-sm text-gray-600 font-medium">1. Scan this QR code with your authenticator</p>
                                                        <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-200 w-fit mx-auto">
                                                            <img src={twoFaQrCode} alt="2FA QR Code" />
                                                        </div>
                                                        <p className="text-sm text-gray-600 font-medium">2. Enter the 6-digit code to verify</p>
                                                        <input
                                                            type="text"
                                                            maxLength={6}
                                                            value={twoFaCode}
                                                            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary text-center tracking-widest text-lg font-bold"
                                                            placeholder="000000"
                                                        />
                                                        <Button
                                                            onClick={handleTwoFaEnable}
                                                            disabled={twoFaCode.length !== 6}
                                                            className="w-full"
                                                        >
                                                            Verify & Enable
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => setTwoFaStep('choose')}
                                                            className="w-full"
                                                        >
                                                            Back
                                                        </Button>
                                                    </div>
                                                )}
                                                {twoFaStep === 'setup_email' && (
                                                    <div className="space-y-4 bg-white p-4 border border-gray-100 rounded-xl">
                                                        <p className="text-sm text-gray-600 font-medium text-center">We've sent a 6-digit code to your admin email.</p>
                                                        <input
                                                            type="text"
                                                            maxLength={6}
                                                            value={twoFaCode}
                                                            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary text-center tracking-widest text-lg font-bold"
                                                            placeholder="000000"
                                                        />
                                                        <Button
                                                            onClick={handleTwoFaEnable}
                                                            disabled={twoFaCode.length !== 6}
                                                            className="w-full"
                                                        >
                                                            Verify & Enable Email 2FA
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => setTwoFaStep('choose')}
                                                            className="w-full"
                                                        >
                                                            Back
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                                    <p className="text-sm text-yellow-800">
                                                        ⚠️ Disabling 2FA makes your admin account significantly less secure.
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Authenticator Code to Disable</label>
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        value={disableTwoFaCode}
                                                        onChange={(e) => setDisableTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary text-center tracking-widest text-lg font-bold"
                                                        placeholder="000000"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={handleTwoFaDisable}
                                                    disabled={disableTwoFaCode.length !== 6}
                                                    className="w-full bg-red-600 hover:bg-red-700 border-none"
                                                >
                                                    Disable 2FA
                                                </Button>
                                            </div>
                                        )}
                                    </div>
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
