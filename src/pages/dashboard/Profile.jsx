import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import User from 'lucide-react/dist/esm/icons/user';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Award from 'lucide-react/dist/esm/icons/award';
import Users from 'lucide-react/dist/esm/icons/users';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Key from 'lucide-react/dist/esm/icons/key';
import Code from 'lucide-react/dist/esm/icons/code';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';

export default function Profile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [openSection, setOpenSection] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

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
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/auth/update-password', passwordForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Password updated successfully');
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setOpenSection(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update password');
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
            alert(`PIN ${action}d successfully`);
            fetchProfileData();
            setPinForm({ pin: '', confirmPin: '', currentPin: '' });
        } catch (error) {
            alert(error.response?.data?.message || `Failed to ${action} PIN`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 text-white shadow-xl"
            >
                <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <User size={40} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{profileData?.name || 'User'}</h1>
                        <div className="flex items-center space-x-2 mt-2">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                {profileData?.accountType || 'User'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Accordion Sections */}
            <div className="space-y-4">
                {/* Personal Information */}
                <AccordionItem
                    title="Personal Information"
                    icon={User}
                    isOpen={openSection === 'personal'}
                    onToggle={() => toggleSection('personal')}
                >
                    <div className="space-y-4">
                        <InfoRow icon={User} label="Name" value={profileData?.name} />
                        <InfoRow icon={Mail} label="Email" value={profileData?.email} />
                        <InfoRow icon={Phone} label="Phone" value={profileData?.phone} />
                        <InfoRow icon={MapPin} label="State" value={profileData?.state || 'Not set'} />
                        <InfoRow icon={CreditCard} label="Airtime Limit" value={`₦${profileData?.airtimeLimit?.toLocaleString() || '10,000'}`} />
                        <InfoRow icon={CreditCard} label="Account Limit" value={`₦${profileData?.accountLimit?.toLocaleString() || '500,000'}`} />
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <Award className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-700">KYC Status</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${profileData?.kycStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {profileData?.kycStatus ? 'Verified' : 'Not Verified'}
                            </span>
                        </div>
                    </div>
                </AccordionItem>

                {/* Referral Link */}
                <AccordionItem
                    title="Referral Link"
                    icon={Users}
                    isOpen={openSection === 'referral'}
                    onToggle={() => toggleSection('referral')}
                >
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm text-gray-600 mb-2">Your Referral Link</p>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={`${window.location.origin}/register?referral=${profileData?.referralCode || ''}`}
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                />
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/register?referral=${profileData?.referralCode || ''}`)}
                                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-sm text-blue-600 mb-1">Total Referrals</p>
                                <p className="text-2xl font-bold text-blue-700">{profileData?.totalReferrals || 0}</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-sm text-green-600 mb-1">Earnings</p>
                                <p className="text-2xl font-bold text-green-700">₦{profileData?.refWallet?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                </AccordionItem>

                {/* Update Password */}
                <AccordionItem
                    title="Update Password"
                    icon={Lock}
                    isOpen={openSection === 'password'}
                    onToggle={() => toggleSection('password')}
                >
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
                            <input
                                type="password"
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                                minLength={8}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            Update Password
                        </button>
                    </form>
                </AccordionItem>

                {/* Transaction PIN */}
                <AccordionItem
                    title="Transaction PIN"
                    icon={Key}
                    isOpen={openSection === 'pin'}
                    onToggle={() => toggleSection('pin')}
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <span className="font-medium text-gray-700">PIN Status</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${profileData?.pinEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {profileData?.pinEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>

                        {!profileData?.pinEnabled ? (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-800">
                                        <Shield className="w-4 h-4 inline mr-2" />
                                        Enable PIN for secure transactions
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Create 4-Digit PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={pinForm.pin}
                                        onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="****"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={pinForm.confirmPin}
                                        onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="****"
                                    />
                                </div>
                                <button
                                    onClick={() => handlePinToggle('enable')}
                                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    Enable PIN
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ Disabling PIN will remove transaction security. Only disable if your device is secure.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Enter Current PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={pinForm.currentPin}
                                        onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="****"
                                    />
                                </div>
                                <button
                                    onClick={() => handlePinToggle('disable')}
                                    className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                                >
                                    Disable PIN
                                </button>
                            </div>
                        )}
                    </div>
                </AccordionItem>

                {/* API Access (Vendors Only) */}
                {profileData?.accountType === 'vendor' && (
                    <AccordionItem
                        title="API Access"
                        icon={Code}
                        isOpen={openSection === 'api'}
                        onToggle={() => toggleSection('api')}
                    >
                        <div className="space-y-4">
                            <div className="bg-purple-50 rounded-xl p-4">
                                <p className="text-sm text-purple-600 mb-2">Your API Key</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        readOnly
                                        value={profileData?.apiKey || 'Not generated'}
                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(profileData?.apiKey || '')}
                                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <a
                                    href="/api-docs"
                                    className="flex items-center justify-center space-x-2 bg-white border-2 border-primary text-primary py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors"
                                >
                                    <Code size={20} />
                                    <span>API Docs</span>
                                </a>
                                <a
                                    href="/dashboard/pricing"
                                    className="flex items-center justify-center space-x-2 bg-white border-2 border-secondary text-secondary py-3 rounded-lg font-semibold hover:bg-secondary hover:text-white transition-colors"
                                >
                                    <CreditCard size={20} />
                                    <span>View Pricing</span>
                                </a>
                            </div>
                        </div>
                    </AccordionItem>
                )}

                {/* Contact Us */}
                <AccordionItem
                    title="Contact Us"
                    icon={MessageCircle}
                    isOpen={openSection === 'contact'}
                    onToggle={() => toggleSection('contact')}
                >
                    <div className="space-y-4">
                        <a href="https://wa.me/2348012345678" className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                            <MessageCircle className="w-6 h-6 text-green-600" />
                            <div>
                                <p className="font-medium text-gray-900">WhatsApp</p>
                                <p className="text-sm text-gray-600">+234 801 234 5678</p>
                            </div>
                        </a>
                        <a href="mailto:support@ufriends.com" className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                            <Mail className="w-6 h-6 text-blue-600" />
                            <div>
                                <p className="font-medium text-gray-900">Email</p>
                                <p className="text-sm text-gray-600">support@ufriends.com</p>
                            </div>
                        </a>
                    </div>
                </AccordionItem>

                {/* Logout */}
                <AccordionItem
                    title="Logout"
                    icon={LogOut}
                    isOpen={openSection === 'logout'}
                    onToggle={() => toggleSection('logout')}
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">Are you sure you want to logout?</p>
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </AccordionItem>
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
                            className="fixed inset-0 bg-black/50 z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 shadow-2xl z-50 max-w-sm w-full mx-4"
                        >
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Logout</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Accordion Item Component
function AccordionItem({ title, icon: Icon, isOpen, onToggle, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <span className="text-lg font-semibold text-gray-900">{title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 pt-0 border-t border-gray-100">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Info Row Component
function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">{label}</span>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-gray-900">{value}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
        </div>
    );
}
