import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Save from 'lucide-react/dist/esm/icons/save';
import Link from 'lucide-react/dist/esm/icons/link';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function VerificationSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/verification/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data.settings);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (field, value) => {
        setSettings({ ...settings, [field]: value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');

            // Filter out database-generated fields
            const { id, createdAt, updatedAt, ...settingsToSave } = settings;

            console.log('Saving settings:', settingsToSave);

            const res = await axios.put('/api/admin/verification/settings', settingsToSave, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Settings saved successfully!');
            // Refresh settings to get updated data
            await fetchSettings();
        } catch (error) {
            console.error('Save error:', error.response?.data || error);
            alert(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setConnectionStatus(null);

        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/verification/test-connection', {
                apiKey: settings.apiKey,
                appId: settings.appId,
                baseUrl: settings.baseUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setConnectionStatus({ success: true, message: res.data.message });
        } catch (error) {
            setConnectionStatus({
                success: false,
                message: error.response?.data?.error || 'Connection test failed'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Verification Service Settings</h1>
                <p className="text-gray-500">Configure Prembly API credentials and pricing for BVN/NIN verification</p>
            </div>

            {/* API Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <div className="flex items-center space-x-2">
                        <h2 className="font-bold text-lg">Prembly API Configuration</h2>
                        {settings?.active && <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Active</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Active:</label>
                        <input
                            type="checkbox"
                            checked={settings?.active || false}
                            onChange={(e) => handleUpdate('active', e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 text-white focus:ring-offset-0 bg-transparent"
                        />
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <Input
                        label="API Key"
                        value={settings?.apiKey || ''}
                        onChange={(e) => handleUpdate('apiKey', e.target.value)}
                        type="password"
                        placeholder="Enter Prembly API Key (x-api-key)"
                    />
                    <Input
                        label="App ID (Optional)"
                        value={settings?.appId || ''}
                        onChange={(e) => handleUpdate('appId', e.target.value)}
                        type="password"
                        placeholder="Enter Prembly App ID (app-id) - if required"
                    />
                    <Input
                        label="Base URL"
                        value={settings?.baseUrl || ''}
                        onChange={(e) => handleUpdate('baseUrl', e.target.value)}
                        placeholder="https://api.prembly.com"
                    />

                    {/* Connection Status Message */}
                    {connectionStatus && (
                        <div className={`p-3 rounded-lg text-sm flex items-start space-x-2 ${connectionStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {connectionStatus.success ?
                                <CheckCircle size={16} className="mt-0.5 shrink-0" /> :
                                <XCircle size={16} className="mt-0.5 shrink-0" />
                            }
                            <span>{connectionStatus.message}</span>
                        </div>
                    )}

                    <div className="flex space-x-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleTestConnection}
                            loading={testingConnection}
                            icon={Link}
                        >
                            Test Connection
                        </Button>
                    </div>
                </div>
            </div>

            {/* BVN Pricing (Regular) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
                    <h2 className="font-bold text-lg">BVN Pricing (Regular Slip)</h2>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="User Price (₦)"
                        type="number"
                        value={settings?.bvnUserPrice || 0}
                        onChange={(e) => handleUpdate('bvnUserPrice', parseFloat(e.target.value) || 0)}
                        placeholder="500"
                    />
                    <Input
                        label="Agent Price (₦)"
                        type="number"
                        value={settings?.bvnAgentPrice || 0}
                        onChange={(e) => handleUpdate('bvnAgentPrice', parseFloat(e.target.value) || 0)}
                        placeholder="450"
                    />
                    <Input
                        label="Vendor Price (₦)"
                        type="number"
                        value={settings?.bvnVendorPrice || 0}
                        onChange={(e) => handleUpdate('bvnVendorPrice', parseFloat(e.target.value) || 0)}
                        placeholder="400"
                    />
                    <Input
                        label="API Cost (₦)"
                        type="number"
                        value={settings?.bvnApiPrice || 0}
                        onChange={(e) => handleUpdate('bvnApiPrice', parseFloat(e.target.value) || 0)}
                        placeholder="300"
                    />
                    <Input
                        label="Ref Commission (₦)"
                        type="number"
                        value={settings?.bvnReferralCommission || 0}
                        onChange={(e) => handleUpdate('bvnReferralCommission', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                </div>
            </div>

            {/* BVN Pricing (Plastic) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                    <h2 className="font-bold text-lg">BVN Pricing (Premium Plastic Slip)</h2>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="User Price (₦)"
                        type="number"
                        value={settings?.bvnPlasticUserPrice || 0}
                        onChange={(e) => handleUpdate('bvnPlasticUserPrice', parseFloat(e.target.value) || 0)}
                        placeholder="1000"
                    />
                    <Input
                        label="Agent Price (₦)"
                        type="number"
                        value={settings?.bvnPlasticAgentPrice || 0}
                        onChange={(e) => handleUpdate('bvnPlasticAgentPrice', parseFloat(e.target.value) || 0)}
                        placeholder="950"
                    />
                    <Input
                        label="Vendor Price (₦)"
                        type="number"
                        value={settings?.bvnPlasticVendorPrice || 0}
                        onChange={(e) => handleUpdate('bvnPlasticVendorPrice', parseFloat(e.target.value) || 0)}
                        placeholder="900"
                    />
                    <Input
                        label="API Cost (₦)"
                        type="number"
                        value={settings?.bvnPlasticApiPrice || 0}
                        onChange={(e) => handleUpdate('bvnPlasticApiPrice', parseFloat(e.target.value) || 0)}
                        placeholder="800"
                    />
                </div>
            </div>

            {/* NIN Slip Service Pricing */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center text-white">
                    <div className="flex items-center space-x-2">
                        <h2 className="font-bold text-lg">NIN Slip Service Pricing</h2>
                        {settings?.ninActive && <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Active</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Active:</label>
                        <input
                            type="checkbox"
                            checked={settings?.ninActive || false}
                            onChange={(e) => handleUpdate('ninActive', e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 text-white focus:ring-offset-0 bg-transparent"
                        />
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Regular Slip Pricing */}
                    <div className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-bold text-gray-900 mb-3">Regular Slip (Basic NIMC Format)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="User Price (₦)"
                                type="number"
                                value={settings?.ninRegularUserPrice || 0}
                                onChange={(e) => handleUpdate('ninRegularUserPrice', parseFloat(e.target.value) || 0)}
                                placeholder="150"
                            />
                            <Input
                                label="Agent Price (₦)"
                                type="number"
                                value={settings?.ninRegularAgentPrice || 0}
                                onChange={(e) => handleUpdate('ninRegularAgentPrice', parseFloat(e.target.value) || 0)}
                                placeholder="140"
                            />
                            <Input
                                label="Vendor Price (₦)"
                                type="number"
                                value={settings?.ninRegularVendorPrice || 0}
                                onChange={(e) => handleUpdate('ninRegularVendorPrice', parseFloat(e.target.value) || 0)}
                                placeholder="130"
                            />
                            <Input
                                label="API Cost (₦)"
                                type="number"
                                value={settings?.ninRegularApiPrice || 0}
                                onChange={(e) => handleUpdate('ninRegularApiPrice', parseFloat(e.target.value) || 0)}
                                placeholder="100"
                            />
                            <Input
                                label="Ref Commission (₦)"
                                type="number"
                                value={settings?.ninRegularReferralCommission || 0}
                                onChange={(e) => handleUpdate('ninRegularReferralCommission', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Standard Slip Pricing */}
                    <div className="border-l-4 border-green-500 pl-4">
                        <h3 className="font-bold text-gray-900 mb-3">Standard Slip (ID Card with QR Code)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="User Price (₦)"
                                type="number"
                                value={settings?.ninStandardUserPrice || 0}
                                onChange={(e) => handleUpdate('ninStandardUserPrice', parseFloat(e.target.value) || 0)}
                                placeholder="200"
                            />
                            <Input
                                label="Agent Price (₦)"
                                type="number"
                                value={settings?.ninStandardAgentPrice || 0}
                                onChange={(e) => handleUpdate('ninStandardAgentPrice', parseFloat(e.target.value) || 0)}
                                placeholder="190"
                            />
                            <Input
                                label="Vendor Price (₦)"
                                type="number"
                                value={settings?.ninStandardVendorPrice || 0}
                                onChange={(e) => handleUpdate('ninStandardVendorPrice', parseFloat(e.target.value) || 0)}
                                placeholder="180"
                            />
                            <Input
                                label="API Cost (₦)"
                                type="number"
                                value={settings?.ninStandardApiPrice || 0}
                                onChange={(e) => handleUpdate('ninStandardApiPrice', parseFloat(e.target.value) || 0)}
                                placeholder="150"
                            />
                            <Input
                                label="Ref Commission (₦)"
                                type="number"
                                value={settings?.ninStandardReferralCommission || 0}
                                onChange={(e) => handleUpdate('ninStandardReferralCommission', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Premium Slip Pricing */}
                    <div className="border-l-4 border-purple-500 pl-4">
                        <h3 className="font-bold text-gray-900 mb-3">Premium Slip (Premium ID Card Design)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="User Price (₦)"
                                type="number"
                                value={settings?.ninPremiumUserPrice || 0}
                                onChange={(e) => handleUpdate('ninPremiumUserPrice', parseFloat(e.target.value) || 0)}
                                placeholder="200"
                            />
                            <Input
                                label="Agent Price (₦)"
                                type="number"
                                value={settings?.ninPremiumAgentPrice || 0}
                                onChange={(e) => handleUpdate('ninPremiumAgentPrice', parseFloat(e.target.value) || 0)}
                                placeholder="190"
                            />
                            <Input
                                label="Vendor Price (₦)"
                                type="number"
                                value={settings?.ninPremiumVendorPrice || 0}
                                onChange={(e) => handleUpdate('ninPremiumVendorPrice', parseFloat(e.target.value) || 0)}
                                placeholder="180"
                            />
                            <Input
                                label="API Cost (₦)"
                                type="number"
                                value={settings?.ninPremiumApiPrice || 0}
                                onChange={(e) => handleUpdate('ninPremiumApiPrice', parseFloat(e.target.value) || 0)}
                                placeholder="150"
                            />
                            <Input
                                label="Ref Commission (₦)"
                                type="number"
                                value={settings?.ninPremiumReferralCommission || 0}
                                onChange={(e) => handleUpdate('ninPremiumReferralCommission', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* VNIN Slip Pricing */}
                    <div className="border-l-4 border-amber-500 pl-4">
                        <h3 className="font-bold text-gray-900 mb-3">VNIN Slip (Verification-as-a-Service Report)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="User Price (₦)"
                                type="number"
                                value={settings?.ninVninUserPrice || 0}
                                onChange={(e) => handleUpdate('ninVninUserPrice', parseFloat(e.target.value) || 0)}
                                placeholder="1000"
                            />
                            <Input
                                label="Agent Price (₦)"
                                type="number"
                                value={settings?.ninVninAgentPrice || 0}
                                onChange={(e) => handleUpdate('ninVninAgentPrice', parseFloat(e.target.value) || 0)}
                                placeholder="900"
                            />
                            <Input
                                label="Vendor Price (₦)"
                                type="number"
                                value={settings?.ninVninVendorPrice || 0}
                                onChange={(e) => handleUpdate('ninVninVendorPrice', parseFloat(e.target.value) || 0)}
                                placeholder="800"
                            />
                            <Input
                                label="API Cost (₦)"
                                type="number"
                                value={settings?.ninVninApiPrice || 0}
                                onChange={(e) => handleUpdate('ninVninApiPrice', parseFloat(e.target.value) || 0)}
                                placeholder="600"
                            />
                            <Input
                                label="Verification Agent ID"
                                value={settings?.ninVerificationAgentId || ''}
                                onChange={(e) => handleUpdate('ninVerificationAgentId', e.target.value)}
                                placeholder="JZLHTW-8978"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    loading={saving}
                    icon={Save}
                    className="px-8"
                >
                    Save All Settings
                </Button>
            </div>
        </div>
    );
}
