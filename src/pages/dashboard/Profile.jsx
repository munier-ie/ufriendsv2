import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, MapPin, CreditCard, Shield, Award, Users, Lock, Key, KeyRound,
    Smartphone, Code, MessageCircle, LogOut, ChevronRight, Copy, Eye, EyeOff, 
    Check, X, RefreshCw, Loader2, Sparkles, ExternalLink, ShieldCheck, CheckCircle,
    CheckCircle2, Unlock, AlertTriangle, QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { modal } from '../../contexts/ModalContext';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Profile() {
    const navigate = useNavigate();
    const { globalSettings } = useOutletContext() || {};
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'security', 'api', 'support'
    
    // API Key Visibility
    const [showApiKey, setShowApiKey] = useState(false);
    const [showTestApiKey, setShowTestApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // API Whitelist state
    const [apiIpsForm, setApiIpsForm] = useState('');
    const [savingIps, setSavingIps] = useState(false);

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // PIN form state
    const [pinForm, setPinForm] = useState({
        pin: '',
        confirmPin: '',
        currentPin: ''
    });

    // Reset PIN form state (when PIN is already enabled)
    const [changePinMode, setChangePinMode] = useState(false);
    const [resetPinStep, setResetPinStep] = useState('initial');
    const [changePinForm, setChangePinForm] = useState({
        otp: '',
        newPin: '',
        confirmPin: ''
    });
    const [changePinLoading, setChangePinLoading] = useState(false);

    // 2FA state
    const [twoFaStep, setTwoFaStep] = useState('initial'); // 'initial', 'choose', 'setup_totp', 'setup_email'
    const [twoFaMethod, setTwoFaMethod] = useState('totp');
    const [twoFaQrCode, setTwoFaQrCode] = useState('');
    const [twoFaToken, setTwoFaToken] = useState('');
    const [twoFaSecret, setTwoFaSecret] = useState('');
    const [twoFaCopied, setTwoFaCopied] = useState(false);
    const [twoFaCode, setTwoFaCode] = useState('');
    const [disableTwoFaCode, setDisableTwoFaCode] = useState('');
    const [disableEmailSent, setDisableEmailSent] = useState(false);
    const [sendingDisableOtp, setSendingDisableOtp] = useState(false);
    const [disablingTwoFa, setDisablingTwoFa] = useState(false);
    const [enablingTwoFa, setEnablingTwoFa] = useState(false);
    const [showDisableSection, setShowDisableSection] = useState(false);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileData(response.data);
            setApiIpsForm(response.data.apiIps || '');
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            modal.error('Failed to load profile details');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        modal.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            modal.error('Passwords do not match');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/auth/update-password', passwordForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('Password updated successfully!');
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            modal.error(error.response?.data?.message || 'Failed to update password');
        }
    };

    const handleRequestPinReset = async () => {
        setChangePinLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/auth/pin/forgot', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('Reset OTP sent to your email!');
            setResetPinStep('otp_sent');
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to request PIN reset');
        } finally {
            setChangePinLoading(false);
        }
    };

    const handleResetPinSubmit = async (e) => {
        e.preventDefault();
        if (changePinForm.newPin !== changePinForm.confirmPin) {
            modal.error('New PINs do not match');
            return;
        }
        setChangePinLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/auth/pin/reset-with-otp', changePinForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('Transaction PIN reset successfully!');
            setChangePinForm({ otp: '', newPin: '', confirmPin: '' });
            setResetPinStep('initial');
            setChangePinMode(false);
            fetchProfileData();
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to reset PIN');
        } finally {
            setChangePinLoading(false);
        }
    };

    const handlePinToggle = async (action) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/auth/pin/toggle', {
                action,
                ...pinForm
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success(`PIN ${action}d successfully!`);
            fetchProfileData();
            setPinForm({ pin: '', confirmPin: '', currentPin: '' });
        } catch (error) {
            modal.error(error.response?.data?.message || `Failed to ${action} PIN`);
        }
    };

    const handleTwoFaSetup = async (method = 'totp') => {
        try {
            const token = localStorage.getItem('token');
            if (method === 'totp') {
                const response = await axios.post('/api/twofa/setup', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTwoFaQrCode(response.data.qrCode);
                setTwoFaToken(response.data.tempToken || response.data.secret);
                setTwoFaSecret(response.data.secret || response.data.tempToken);
                setTwoFaStep('setup_totp');
                setTwoFaMethod('totp');
                setTwoFaCode('');
            } else {
                await axios.post('/api/twofa/setup-email', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTwoFaStep('setup_email');
                setTwoFaMethod('email');
                setTwoFaCode('');
            }
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to initialize 2FA setup');
        }
    };

    const handleTwoFaEnable = async () => {
        if (twoFaCode.trim().length !== 6) {
            modal.error('Please enter a valid 6-digit code');
            return;
        }
        setEnablingTwoFa(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/twofa/enable', {
                tempToken: twoFaMethod === 'totp' ? (twoFaToken || twoFaSecret) : undefined,
                code: twoFaCode.trim(),
                method: twoFaMethod
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('Two-Factor Authentication enabled successfully!');
            setProfileData(prev => ({ ...prev, twoFaEnabled: true, twoFaMethod }));
            setTwoFaStep('initial');
            setTwoFaCode('');
            setShowDisableSection(false);
            await fetchProfileData();
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to verify and enable 2FA');
        } finally {
            setEnablingTwoFa(false);
        }
    };

    const handleSendDisableOtp = async () => {
        setSendingDisableOtp(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/twofa/send-disable-otp', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDisableEmailSent(true);
            modal.success(res.data.message || 'Verification code sent to your email');
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to send verification code');
        } finally {
            setSendingDisableOtp(false);
        }
    };

    const handleTwoFaDisable = async () => {
        setDisablingTwoFa(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/twofa/disable', { code: disableTwoFaCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('2FA disabled successfully');
            setProfileData(prev => ({ ...prev, twoFaEnabled: false, twoFaMethod: null }));
            setDisableTwoFaCode('');
            setDisableEmailSent(false);
            setShowDisableSection(false);
            await fetchProfileData();
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to disable 2FA');
        } finally {
            setDisablingTwoFa(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleGenerateApiKey = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/auth/api-key/regenerate', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('API Keys generated successfully!');
            setProfileData(prev => ({ 
                ...prev, 
                apiKey: response.data.apiKey,
                testApiKey: response.data.testApiKey 
            }));
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to generate API Keys');
        }
    };

    const handleSaveApiIps = async () => {
        setSavingIps(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/auth/api-ips', { ips: apiIpsForm }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            modal.success('API Whitelist updated successfully!');
            fetchProfileData();
        } catch (error) {
            modal.error(error.response?.data?.error || 'Failed to update API Whitelist');
        } finally {
            setSavingIps(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="animate-spin text-primary" size={44} />
                <p className="text-gray-400 font-medium text-sm">Loading profile data...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal Details', icon: User },
        { id: 'security', label: 'Security & PIN', icon: Lock },
        ...(profileData?.accountType === 'vendor' ? [{ id: 'api', label: 'API Keys & Whitelist', icon: Code }] : []),
        { id: 'support', label: 'Support & Actions', icon: MessageCircle }
    ];

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Account Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your account credentials, security settings, and API access</p>
                </div>

                <div className="flex items-center space-x-3">
                    <Link to="/dashboard/upgrade">
                        <Button className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl">
                            <Sparkles size={16} />
                            <span>Upgrade Tier</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Profile Overview Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50 text-primary flex items-center justify-center font-bold text-2xl border border-blue-100 shrink-0">
                            {profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{profileData?.name || 'User Account'}</h2>
                                <span className="px-3 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-100 text-primary">
                                    {profileData?.accountType || 'User'}
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mt-0.5">{profileData?.email}</p>
                            <p className="text-gray-400 text-xs mt-1 font-mono">{profileData?.phone || 'No phone set'}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                        <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex-1 md:flex-none">
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Referral Code</p>
                            <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-mono text-sm font-bold text-gray-900">{profileData?.referralCode || 'N/A'}</span>
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/register?referral=${profileData?.referralCode || ''}`)}
                                    className="text-gray-400 hover:text-primary transition-colors"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex-1 md:flex-none">
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">KYC Status</p>
                            <span className={`inline-flex items-center space-x-1 mt-1 text-xs font-bold ${
                                profileData?.kycStatus ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                                <ShieldCheck size={14} />
                                <span>{profileData?.kycStatus ? 'Verified' : 'Unverified'}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-gray-100 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                            }`}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents */}
            <div>
                {/* TAB 1: PERSONAL DETAILS */}
                {activeTab === 'personal' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Personal Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoItem icon={User} label="Full Name" value={profileData?.name} />
                                <InfoItem icon={Mail} label="Email Address" value={profileData?.email} />
                                <InfoItem icon={Phone} label="Phone Number" value={profileData?.phone} />
                                <InfoItem icon={MapPin} label="State of Residence" value={profileData?.state || 'Not set'} />
                                <InfoItem icon={CreditCard} label="Airtime Daily Limit" value={`₦${profileData?.airtimeLimit?.toLocaleString() || '10,000'}`} />
                                <InfoItem icon={CreditCard} label="Account Daily Limit" value={`₦${profileData?.accountLimit?.toLocaleString() || '500,000'}`} />
                            </div>
                        </div>

                        {/* Referral Section */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Referral & Commission</h3>
                            
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Your Referral Link</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/register?referral=${profileData?.referralCode || ''}`}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono text-gray-800 outline-none"
                                    />
                                    <Button
                                        onClick={() => copyToClipboard(`${window.location.origin}/register?referral=${profileData?.referralCode || ''}`)}
                                        className="bg-primary text-white rounded-2xl px-5"
                                    >
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-semibold text-blue-600">Total Referrals</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{profileData?.totalReferrals || 0}</p>
                                </div>
                                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-xs font-semibold text-emerald-600">Referral Wallet Balance</p>
                                    <p className="text-2xl font-bold text-emerald-900 mt-1">₦{profileData?.refWallet?.toLocaleString() || '0'}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* TAB 2: SECURITY & PIN */}
                {activeTab === 'security' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Password Update */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Update Account Password</h3>

                            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-xl">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordForm.oldPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="bg-primary text-white rounded-2xl px-6">
                                    Update Password
                                </Button>
                            </form>
                        </div>

                        {/* Transaction PIN Section */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Transaction PIN</h3>
                                    <p className="text-xs text-gray-500">Require a 4-digit PIN before approving wallet debits</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    profileData?.pinEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {profileData?.pinEnabled ? 'PIN Active' : 'Disabled'}
                                </span>
                            </div>

                            {!profileData?.pinEnabled ? (
                                <div className="space-y-4 max-w-xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Create 4-Digit PIN</label>
                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={4}
                                                value={pinForm.pin}
                                                onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })}
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="****"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm PIN</label>
                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={4}
                                                value={pinForm.confirmPin}
                                                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="****"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={() => handlePinToggle('enable')} className="bg-primary text-white rounded-2xl px-6">
                                        Enable Transaction PIN
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-xl">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setChangePinMode(false); setResetPinStep('initial'); }}
                                            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                                                !changePinMode ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            Disable PIN
                                        </button>
                                        <button
                                            onClick={() => setChangePinMode(true)}
                                            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                                                changePinMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            Reset PIN via Email
                                        </button>
                                    </div>

                                    {!changePinMode ? (
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Enter Current PIN to Disable</label>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    value={pinForm.currentPin}
                                                    onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '') })}
                                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="****"
                                                />
                                            </div>
                                            <Button onClick={() => handlePinToggle('disable')} className="bg-red-600 text-white rounded-2xl px-6">
                                                Disable PIN
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 pt-2">
                                            {resetPinStep === 'initial' ? (
                                                <Button
                                                    onClick={handleRequestPinReset}
                                                    disabled={changePinLoading}
                                                    className="bg-primary text-white rounded-2xl px-6"
                                                >
                                                    {changePinLoading ? 'Sending OTP...' : 'Send Reset OTP to Email'}
                                                </Button>
                                            ) : (
                                                <form onSubmit={handleResetPinSubmit} className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email OTP Code</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={6}
                                                            value={changePinForm.otp}
                                                            onChange={(e) => setChangePinForm({ ...changePinForm, otp: e.target.value.replace(/\D/g, '') })}
                                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                            placeholder="000000"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New 4-Digit PIN</label>
                                                            <input
                                                                type="password"
                                                                inputMode="numeric"
                                                                maxLength={4}
                                                                value={changePinForm.newPin}
                                                                onChange={(e) => setChangePinForm({ ...changePinForm, newPin: e.target.value.replace(/\D/g, '') })}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                                placeholder="****"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New PIN</label>
                                                            <input
                                                                type="password"
                                                                inputMode="numeric"
                                                                maxLength={4}
                                                                value={changePinForm.confirmPin}
                                                                onChange={(e) => setChangePinForm({ ...changePinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                                                placeholder="****"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            type="submit"
                                                            disabled={changePinLoading || changePinForm.otp.length !== 6 || changePinForm.newPin.length !== 4}
                                                            className="bg-emerald-600 text-white rounded-2xl px-6"
                                                        >
                                                            {changePinLoading ? 'Resetting...' : 'Verify OTP & Save PIN'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => setResetPinStep('initial')}
                                                            className="rounded-2xl"
                                                        >
                                                            Back
                                                        </Button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Two-Factor Authentication */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication (2FA)</h3>
                                    <p className="text-xs text-gray-500">Protect account login with TOTP authenticator or Email verification</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    profileData?.twoFaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {profileData?.twoFaEnabled ? '2FA Enabled' : 'Disabled'}
                                </span>
                            </div>

                            {!profileData?.twoFaEnabled ? (
                                <div className="space-y-4 max-w-xl">
                                    {twoFaStep === 'initial' && (
                                        <Button onClick={() => setTwoFaStep('choose')} className="bg-primary text-white rounded-2xl px-6">
                                            Setup 2FA
                                        </Button>
                                    )}

                                    {twoFaStep === 'choose' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handleTwoFaSetup('totp')}
                                                className="p-5 border border-gray-200 rounded-2xl hover:border-primary transition-all text-left space-y-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <KeyRound size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Authenticator App</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Google Authenticator, Authy, or 1Password</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => handleTwoFaSetup('email')}
                                                className="p-5 border border-gray-200 rounded-2xl hover:border-primary transition-all text-left space-y-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Email Verification OTP</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Receive single-use login codes via email</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {twoFaStep === 'setup_totp' && (
                                        <div className="space-y-5 bg-slate-50/80 p-6 rounded-3xl border border-slate-200">
                                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Link Authenticator App</h4>
                                                    <p className="text-xs text-gray-500">Scan QR or enter key in Google Authenticator or Authy</p>
                                                </div>
                                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-primary">
                                                    TOTP
                                                </span>
                                            </div>

                                            {/* QR Code Section */}
                                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center max-w-xs mx-auto">
                                                <p className="text-xs font-semibold text-gray-600 mb-2.5 text-center">
                                                    1. Scan QR Code
                                                </p>
                                                <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-inner">
                                                    {twoFaQrCode ? (
                                                        <img src={twoFaQrCode} alt="2FA QR Code" className="w-44 h-44 object-contain" />
                                                    ) : (
                                                        <div className="w-44 h-44 flex items-center justify-center bg-gray-50 text-gray-400">
                                                            <Loader2 size={32} className="animate-spin text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Manual Setup Key Section */}
                                            {twoFaSecret && (
                                                <div className="space-y-2 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                                                        <span>Can't scan? Use manual setup key:</span>
                                                        <span className="text-[11px] text-gray-400">Account: UFriends</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-200">
                                                        <div className="flex-1 font-mono text-sm tracking-wider font-bold text-gray-800 break-all select-all px-2">
                                                            {twoFaSecret}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(twoFaSecret);
                                                                setTwoFaCopied(true);
                                                                modal.success('Setup key copied to clipboard!');
                                                                setTimeout(() => setTwoFaCopied(false), 2500);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors shrink-0"
                                                        >
                                                            {twoFaCopied ? <Check size={14} /> : <Copy size={14} />}
                                                            {twoFaCopied ? 'Copied' : 'Copy Key'}
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-tight">
                                                        In your authenticator app, tap <b>"+"</b> &rarr; <b>"Enter setup key"</b>, enter <b>UFriends</b> as account, and paste the key.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Verification Code Section */}
                                            <div className="space-y-3 pt-2">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                                                    2. Enter 6-Digit Authenticator Code
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    value={twoFaCode}
                                                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full max-w-xs mx-auto block rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg font-mono text-center tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                                    placeholder="000000"
                                                />
                                                <div className="flex items-center justify-center gap-3 pt-2">
                                                    <Button
                                                        onClick={handleTwoFaEnable}
                                                        disabled={twoFaCode.length !== 6 || enablingTwoFa}
                                                        className="bg-primary text-white rounded-2xl px-6 py-2.5 font-semibold shadow-md shadow-primary/20 hover:opacity-95"
                                                    >
                                                        {enablingTwoFa ? 'Verifying...' : 'Verify & Enable 2FA'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setTwoFaStep('choose');
                                                            setTwoFaCode('');
                                                        }}
                                                        className="rounded-2xl px-5 py-2.5 text-xs"
                                                    >
                                                        Back
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {twoFaStep === 'setup_email' && (
                                        <div className="space-y-5 bg-slate-50/80 p-6 rounded-3xl border border-slate-200">
                                            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                                                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Verify Your Email Address</h4>
                                                    <p className="text-xs text-gray-500">We've sent a 6-digit confirmation code to {profileData?.email}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                                                    Enter 6-Digit Email Code
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    value={twoFaCode}
                                                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full max-w-xs mx-auto block rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg font-mono text-center tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                                    placeholder="000000"
                                                />
                                                <div className="flex items-center justify-center gap-3 pt-2">
                                                    <Button
                                                        onClick={handleTwoFaEnable}
                                                        disabled={twoFaCode.length !== 6 || enablingTwoFa}
                                                        className="bg-primary text-white rounded-2xl px-6 py-2.5 font-semibold shadow-md shadow-primary/20 hover:opacity-95"
                                                    >
                                                        {enablingTwoFa ? 'Verifying...' : 'Verify & Enable Email 2FA'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setTwoFaStep('choose');
                                                            setTwoFaCode('');
                                                        }}
                                                        className="rounded-2xl px-5 py-2.5 text-xs"
                                                    >
                                                        Back
                                                    </Button>
                                                </div>
                                                <div className="text-center pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTwoFaSetup('email')}
                                                        className="text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        Didn't receive code? Resend
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-5 max-w-xl">
                                    {/* Active Summary (Default) */}
                                    {!showDisableSection ? (
                                        <div className="space-y-4">
                                            <div className="p-5 rounded-2xl border border-gray-100 bg-slate-50/70 space-y-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`p-3 rounded-2xl ${
                                                        profileData?.twoFaMethod === 'email'
                                                            ? 'bg-amber-100/80 text-amber-700'
                                                            : 'bg-primary/10 text-primary'
                                                    }`}>
                                                        {profileData?.twoFaMethod === 'email' ? <Mail size={22} /> : <KeyRound size={22} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 text-sm">
                                                                {profileData?.twoFaMethod === 'email' ? 'Email Verification 2FA' : 'Authenticator App (TOTP)'}
                                                            </h4>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                Active
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {profileData?.twoFaMethod === 'email'
                                                                ? `Verification codes sent to ${profileData?.email}`
                                                                : 'Dynamic offline tokens via Google Authenticator or Authy'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Protected Operations</p>
                                                    <div className="space-y-1.5 text-xs text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                            <span>Account sign-in authentication</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                            <span>Wallet withdrawals & fund transfers</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                            <span>Security credentials & API configurations</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowDisableSection(true);
                                                        setDisableTwoFaCode('');
                                                        setDisableEmailSent(false);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-2xl transition-all"
                                                >
                                                    <Unlock size={14} />
                                                    <span>Disable Two-Factor Authentication</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Dedicated Disable Section (Only shown when user clicks to disable) */
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 flex items-start gap-3">
                                                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
                                                    <AlertTriangle size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Disable Two-Factor Authentication</h4>
                                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                        Disabling 2FA lowers account security. Secondary verification codes will no longer be required on future logins or withdrawals.
                                                    </p>
                                                </div>
                                            </div>

                                            {profileData?.twoFaMethod === 'email' ? (
                                                <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                                                    {!disableEmailSent ? (
                                                        <div className="space-y-4">
                                                            <p className="text-xs text-gray-600">
                                                                To confirm disabling 2FA, a 6-digit verification code will be sent to your registered email (<b>{profileData?.email}</b>).
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <Button
                                                                    onClick={handleSendDisableOtp}
                                                                    disabled={sendingDisableOtp}
                                                                    className="bg-primary text-white rounded-2xl px-5 py-2 text-xs font-semibold"
                                                                >
                                                                    {sendingDisableOtp ? 'Sending Code...' : 'Send Verification Code'}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => setShowDisableSection(false)}
                                                                    className="rounded-2xl px-4 py-2 text-xs"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                                                                <CheckCircle size={16} />
                                                                <span>Verification code sent to {profileData?.email}</span>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 text-center">
                                                                    Enter 6-Digit Email Code
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    maxLength={6}
                                                                    value={disableTwoFaCode}
                                                                    onChange={(e) => setDisableTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                                    className="w-full max-w-xs mx-auto block rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg font-mono text-center tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                                                    placeholder="000000"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-center gap-3 pt-1">
                                                                <Button
                                                                    onClick={handleTwoFaDisable}
                                                                    disabled={disableTwoFaCode.length !== 6 || disablingTwoFa}
                                                                    className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-5 py-2 text-xs font-semibold shadow-sm"
                                                                >
                                                                    {disablingTwoFa ? 'Disabling...' : 'Verify & Disable 2FA'}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={handleSendDisableOtp}
                                                                    disabled={sendingDisableOtp}
                                                                    className="rounded-2xl px-4 py-2 text-xs"
                                                                >
                                                                    {sendingDisableOtp ? 'Resending...' : 'Resend Code'}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    onClick={() => setShowDisableSection(false)}
                                                                    className="rounded-2xl px-4 py-2 text-xs text-gray-500"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                                                    <p className="text-xs text-gray-600 text-center">
                                                        Enter the 6-digit code currently shown in your Authenticator App (Google Authenticator, Authy, etc.) to confirm disabling 2FA.
                                                    </p>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={6}
                                                            value={disableTwoFaCode}
                                                            onChange={(e) => setDisableTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                                            className="w-full max-w-xs mx-auto block rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg font-mono text-center tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                                            placeholder="000000"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-center gap-3 pt-1">
                                                        <Button
                                                            onClick={handleTwoFaDisable}
                                                            disabled={disableTwoFaCode.length !== 6 || disablingTwoFa}
                                                            className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-5 py-2 text-xs font-semibold shadow-sm"
                                                        >
                                                            {disablingTwoFa ? 'Disabling...' : 'Verify & Disable 2FA'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setShowDisableSection(false)}
                                                            className="rounded-2xl px-4 py-2 text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* TAB 3: API KEYS & WHITELIST */}
                {activeTab === 'api' && profileData?.accountType === 'vendor' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Developer API Keys</h3>
                                    <p className="text-xs text-gray-500">Live and Sandbox Bearer tokens for API v1</p>
                                </div>
                                <Button onClick={handleGenerateApiKey} variant="outline" className="rounded-2xl text-xs">
                                    Regenerate Keys
                                </Button>
                            </div>

                            {/* Live API Key */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Live API Key</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        readOnly
                                        value={profileData?.apiKey || 'Not generated'}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono outline-none"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors text-gray-700"
                                    >
                                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <Button onClick={() => copyToClipboard(profileData?.apiKey || '')} className="bg-primary text-white rounded-2xl">
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Test API Key */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Test API Key (Sandbox)</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type={showTestApiKey ? 'text' : 'password'}
                                        readOnly
                                        value={profileData?.testApiKey || 'Not generated'}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono outline-none"
                                    />
                                    <button
                                        onClick={() => setShowTestApiKey(!showTestApiKey)}
                                        className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors text-gray-700"
                                    >
                                        {showTestApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <Button onClick={() => copyToClipboard(profileData?.testApiKey || '')} className="bg-primary text-white rounded-2xl">
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* IP Whitelist */}
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">IP Whitelist</label>
                                <p className="text-xs text-gray-500">Comma-separated IPv4/IPv6 addresses allowed to execute API calls (leave blank for any IP).</p>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. 192.168.1.1, 10.0.0.1"
                                        value={apiIpsForm}
                                        onChange={(e) => setApiIpsForm(e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono text-gray-800 outline-none"
                                    />
                                    <Button onClick={handleSaveApiIps} disabled={savingIps} className="bg-primary text-white rounded-2xl px-6">
                                        {savingIps ? 'Saving...' : 'Save IPs'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* TAB 4: SUPPORT & LOGOUT */}
                {activeTab === 'support' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Help & Support Channels</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(globalSettings?.contactWhatsapp || globalSettings?.sitePhone) && (
                                    <a
                                        href={`https://wa.me/${String(globalSettings?.contactWhatsapp || globalSettings?.sitePhone || '').replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center space-x-4 hover:bg-emerald-100/50 transition-all"
                                    >
                                        <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                                            <MessageCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">WhatsApp Support</h4>
                                            <p className="text-xs text-gray-600">{globalSettings?.contactWhatsapp || globalSettings?.sitePhone}</p>
                                        </div>
                                    </a>
                                )}

                                {globalSettings?.siteEmail && (
                                    <a
                                        href={`mailto:${globalSettings?.siteEmail}`}
                                        className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center space-x-4 hover:bg-blue-100/50 transition-all"
                                    >
                                        <div className="p-3 bg-primary text-white rounded-2xl">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">Email Support</h4>
                                            <p className="text-xs text-gray-600">{globalSettings?.siteEmail}</p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Account Logout Card */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-red-100 space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-red-600">Account Logout</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Safely terminate your current dashboard session</p>
                            </div>
                            <Button onClick={() => setShowLogoutModal(true)} className="bg-red-600 text-white rounded-2xl px-6">
                                <LogOut size={16} className="mr-2 inline" />
                                <span>Logout Account</span>
                            </Button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutModal(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-50 max-w-sm w-full mx-4 border border-gray-100 space-y-4"
                        >
                            <h3 className="text-xl font-bold text-gray-900">Confirm Logout</h3>
                            <p className="text-sm text-gray-600">Are you sure you want to end your current session?</p>
                            <div className="flex space-x-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 rounded-2xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleLogout}
                                    className="flex-1 bg-red-600 text-white rounded-2xl"
                                >
                                    Logout
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100/80 space-y-1">
            <div className="flex items-center space-x-2 text-gray-400">
                <Icon size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 break-words">{value || 'Not set'}</p>
        </div>
    );
}
