import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Save from 'lucide-react/dist/esm/icons/save';
import Link from 'lucide-react/dist/esm/icons/link';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function PaymentGatewaySettings() {
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testingConnection, setTestingConnection] = useState(null); // provider name
    const [connectionStatus, setConnectionStatus] = useState({}); // { [provider]: { success: bool, message: string } }
    const [saving, setSaving] = useState(null); // provider name

    // Configuration for different providers
    const providers = [
        { id: 'PAYMENTPOINT', name: 'PaymentPoint', color: 'bg-blue-600', fields: ['apiKey', 'apiSecret', 'businessId'] },
        { id: 'PAYSTACK', name: 'Paystack', color: 'bg-teal-600', fields: ['apiKey', 'secretKey'] },
        { id: 'MONNIFY', name: 'Monnify', color: 'bg-orange-500', fields: ['apiKey', 'secretKey', 'contractCode'] },
        { id: 'PAYVESSEL', name: 'Payvessel', color: 'bg-indigo-600', fields: ['apiKey', 'apiSecret', 'businessId'] }
    ];

    useEffect(() => {
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/admin/payment-gateways', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Merge fetched data with default structure
            const merged = providers.map(p => {
                const existing = res.data.gateways.find(g => g.provider === p.id);
                return existing || { provider: p.id, apiKey: '', secretKey: '', apiSecret: '', businessId: '', contractCode: '', active: false };
            });

            setGateways(merged);
        } catch (error) {
            console.error('Failed to fetch gateways', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (providerId, field, value) => {
        setGateways(gateways.map(g =>
            g.provider === providerId ? { ...g, [field]: value } : g
        ));
    };

    const handleSave = async (gateway) => {
        setSaving(gateway.provider);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/admin/payment-gateways', gateway, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Show success logic here
        } catch (error) {
            toast.error('Failed to save gateway settings')
        } finally {
            setSaving(null);
        }
    };

    const handleTestConnection = async (gateway) => {
        setTestingConnection(gateway.provider);
        setConnectionStatus({ ...connectionStatus, [gateway.provider]: null });

        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post('/api/admin/payment-gateways/test-connection', gateway, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setConnectionStatus(prev => ({
                ...prev,
                [gateway.provider]: { success: true, message: res.data.message }
            }));
        } catch (error) {
            setConnectionStatus(prev => ({
                ...prev,
                [gateway.provider]: { success: false, message: error.response?.data?.error || 'Connection failed' }
            }));
        } finally {
            setTestingConnection(null);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
                <p className="text-gray-500">Configure API keys and connection settings for payment providers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gateways.map(gateway => {
                    const providerConfig = providers.find(p => p.id === gateway.provider);

                    return (
                        <div key={gateway.provider} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className={`${providerConfig.color} px-6 py-4 flex justify-between items-center text-white`}>
                                <div className="flex items-center space-x-2">
                                    <h2 className="font-bold text-lg">{providerConfig.name}</h2>
                                    {gateway.active && <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Active</span>}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={gateway.active}
                                        onChange={(e) => handleUpdate(gateway.provider, 'active', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/30 text-white focus:ring-offset-0 bg-transparent"
                                    />
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {providerConfig.fields.includes('apiKey') && (
                                    <Input
                                        label="API Key"
                                        value={gateway.apiKey}
                                        onChange={(e) => handleUpdate(gateway.provider, 'apiKey', e.target.value)}
                                        type="password"
                                    />
                                )}
                                {providerConfig.fields.includes('secretKey') && (
                                    <Input
                                        label="Secret Key"
                                        value={gateway.secretKey}
                                        onChange={(e) => handleUpdate(gateway.provider, 'secretKey', e.target.value)}
                                        type="password"
                                    />
                                )}
                                {providerConfig.fields.includes('apiSecret') && (
                                    <Input
                                        label="API Secret"
                                        value={gateway.apiSecret}
                                        onChange={(e) => handleUpdate(gateway.provider, 'apiSecret', e.target.value)}
                                        type="password"
                                    />
                                )}
                                {providerConfig.fields.includes('businessId') && (
                                    <Input
                                        label="Business ID"
                                        value={gateway.businessId}
                                        onChange={(e) => handleUpdate(gateway.provider, 'businessId', e.target.value)}
                                    />
                                )}
                                {providerConfig.fields.includes('contractCode') && (
                                    <Input
                                        label="Contract Code"
                                        value={gateway.contractCode}
                                        onChange={(e) => handleUpdate(gateway.provider, 'contractCode', e.target.value)}
                                    />
                                )}

                                {/* Connection Status Message */}
                                {connectionStatus[gateway.provider] && (
                                    <div className={`p-3 rounded-lg text-sm flex items-start space-x-2 ${connectionStatus[gateway.provider].success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {connectionStatus[gateway.provider].success ?
                                            <CheckCircle size={16} className="mt-0.5 shrink-0" /> :
                                            <XCircle size={16} className="mt-0.5 shrink-0" />
                                        }
                                        <span>{connectionStatus[gateway.provider].message}</span>
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleTestConnection(gateway)}
                                        loading={testingConnection === gateway.provider}
                                        icon={Link}
                                    >
                                        Test Connection
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleSave(gateway)}
                                        loading={saving === gateway.provider}
                                        icon={Save}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
