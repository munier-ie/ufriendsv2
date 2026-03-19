import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Save from 'lucide-react/dist/esm/icons/save';
import Palette from 'lucide-react/dist/esm/icons/palette';
import Percent from 'lucide-react/dist/esm/icons/percent';
import Image from 'lucide-react/dist/esm/icons/image';

export default function SiteSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/config/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data.settings);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/api/admin/config/settings', settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateAirtimeDiscount = (network, value) => {
        setSettings({
            ...settings,
            airtimeDiscount: {
                ...settings.airtimeDiscount,
                [network]: parseFloat(value)
            }
        });
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
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    Site Settings
                </h1>
                <p className="text-gray-600 mt-2">Configure global platform settings and appearance</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${message.includes('success') ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {message}
                </div>
            )}

            {/* Settings Sections */}
            <div className="space-y-6">
                {/* General Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">🏢</span>
                        </div>
                        General Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                            <input
                                type="text"
                                value={settings?.siteName || ''}
                                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                            <input
                                type="email"
                                value={settings?.siteEmail || ''}
                                onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                            <input
                                type="tel"
                                value={settings?.sitePhone || ''}
                                onChange={(e) => setSettings({ ...settings, sitePhone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Airtime Discount Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                            <Percent className="text-orange-600" size={20} />
                        </div>
                        Airtime Discount Rates
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">Set percentage discounts for airtime purchases by network</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">MTN Discount (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings?.airtimeDiscount?.mtn || 0}
                                onChange={(e) => updateAirtimeDiscount('mtn', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GLO Discount (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings?.airtimeDiscount?.glo || 0}
                                onChange={(e) => updateAirtimeDiscount('glo', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Airtel Discount (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings?.airtimeDiscount?.airtel || 0}
                                onChange={(e) => updateAirtimeDiscount('airtel', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">9mobile Discount (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings?.airtimeDiscount?.['9mobile'] || 0}
                                onChange={(e) => updateAirtimeDiscount('9mobile', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Theme Customization */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <Palette className="text-purple-600" size={20} />
                        </div>
                        Theme Customization
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">Customize the platform's color scheme</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="color"
                                    value={settings?.primaryColor || '#3B82F6'}
                                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                    className="w-16 h-12 rounded-lg border border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={settings?.primaryColor || '#3B82F6'}
                                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                                    placeholder="#3B82F6"
                                />
                            </div>
                            <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: settings?.primaryColor }}>
                                <p className="text-white text-sm font-medium">Preview</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="color"
                                    value={settings?.secondaryColor || '#10B981'}
                                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                                    className="w-16 h-12 rounded-lg border border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={settings?.secondaryColor || '#10B981'}
                                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                                    placeholder="#10B981"
                                />
                            </div>
                            <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: settings?.secondaryColor }}>
                                <p className="text-white text-sm font-medium">Preview</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                            <Image className="text-pink-600" size={20} />
                        </div>
                        Branding Assets
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                            <input
                                type="text"
                                value={settings?.logoUrl || ''}
                                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="/logo.png"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
                            <input
                                type="text"
                                value={settings?.faviconUrl || ''}
                                onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="/favicon.ico"
                            />
                        </div>
                    </div>
                </div>

                {/* Referral Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">👥</span>
                        </div>
                        Referral Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Bonus (₦)</label>
                            <input
                                type="number"
                                value={settings?.referralBonus || 0}
                                onChange={(e) => setSettings({ ...settings, referralBonus: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Balance for Referral (₦)</label>
                            <input
                                type="number"
                                value={settings?.referralMinBalance || 0}
                                onChange={(e) => setSettings({ ...settings, referralMinBalance: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* KYC Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">🔐</span>
                        </div>
                        KYC Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings?.kycRequired || false}
                                onChange={(e) => setSettings({ ...settings, kycRequired: e.target.checked })}
                                className="w-5 h-5 text-primary focus:ring-primary rounded"
                            />
                            <label className="text-sm font-medium text-gray-700">KYC Required for Withdrawals</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum KYC Level</label>
                            <select
                                value={settings?.kycMinimumLevel || 1}
                                onChange={(e) => setSettings({ ...settings, kycMinimumLevel: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="1">Level 1</option>
                                <option value="2">Level 2</option>
                                <option value="3">Level 3</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Withdrawal Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">💸</span>
                        </div>
                        Withdrawal Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Withdrawal (₦)</label>
                            <input
                                type="number"
                                value={settings?.minWithdrawal || 0}
                                onChange={(e) => setSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Withdrawal (₦)</label>
                            <input
                                type="number"
                                value={settings?.maxWithdrawal || 0}
                                onChange={(e) => setSettings({ ...settings, maxWithdrawal: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Charge (₦)</label>
                            <input
                                type="number"
                                value={settings?.withdrawalCharge || 0}
                                onChange={(e) => setSettings({ ...settings, withdrawalCharge: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Upgrade Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">⬆️</span>
                        </div>
                        Account Upgrade Fees
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Agent Upgrade (₦)</label>
                            <input
                                type="number"
                                value={settings?.agentUpgradeAmount || 0}
                                onChange={(e) => setSettings({ ...settings, agentUpgradeAmount: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Upgrade (₦)</label>
                            <input
                                type="number"
                                value={settings?.vendorUpgradeAmount || 0}
                                onChange={(e) => setSettings({ ...settings, vendorUpgradeAmount: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* System Controls */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">⚙️</span>
                        </div>
                        System Controls
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={settings?.maintenanceMode || false}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="w-5 h-5 text-primary focus:ring-primary rounded"
                            />
                            <div>
                                <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                                <p className="text-xs text-gray-500">Disable all user access temporarily</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={settings?.registrationEnabled || false}
                                onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                                className="w-5 h-5 text-primary focus:ring-primary rounded"
                            />
                            <div>
                                <label className="text-sm font-medium text-gray-700">Registration Enabled</label>
                                <p className="text-xs text-gray-500">Allow new user registrations</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WhatsApp Configuration */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-xl">💬</span>
                        </div>
                        WhatsApp Bot Configuration
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">Configure the automated WhatsApp notification bot for manual services</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notification Number (e.g. 2348123456789)</label>
                            <input
                                type="text"
                                value={settings?.adminWhatsappNumber || ''}
                                onChange={(e) => setSettings({ ...settings, adminWhatsappNumber: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="234..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp API Key</label>
                                <input
                                    type="password"
                                    value={settings?.whatsappApiKey || ''}
                                    onChange={(e) => setSettings({ ...settings, whatsappApiKey: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp API Base URL</label>
                                <input
                                    type="text"
                                    value={settings?.whatsappApiUrl || ''}
                                    onChange={(e) => setSettings({ ...settings, whatsappApiUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="https://api.gateway.com/send"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end sticky bottom-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold shadow-xl"
                >
                    <Save size={20} />
                    <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
                </button>
            </div>
        </div>
    );
}
